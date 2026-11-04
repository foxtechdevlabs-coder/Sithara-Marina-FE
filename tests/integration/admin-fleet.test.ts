import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Admin yacht management against a stubbed `fetch`. Paths, methods and bodies
// follow the backend OpenAPI contract for /admin/yachts/*, /admin/price-rules/*
// and /admin/media/uploads.
const API = "http://api.test";
const YACHT_ID = "11111111-1111-4111-8111-111111111111";

function json(body: unknown, status = 200) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const yacht = {
  id: YACHT_ID,
  name: "Azure 52",
  slug: "azure-52",
  ownership_type: "partner",
  partner: { id: "p-1", name: "Coastal Co." },
  commission_rate: 12.5,
  type: "Motor yacht",
  length_ft: 52,
  capacity: 12,
  suites: 2,
  description: null,
  departure_city: "Kochi",
  departure_points: ["Marina Mall Jetty"],
  amenities: [],
  inclusions: [],
  crew: [],
  policies: null,
  booking_mode: "instant",
  enquiry_enabled: false,
  opens_at: null,
  closes_at: null,
  turnaround_minutes: 30,
  is_active: true,
  is_visible: false,
  is_featured: false,
  created_at: "2026-11-01T10:00:00.000Z",
  updated_at: "2026-11-01T10:00:00.000Z",
};
const photo = (n: number) => ({
  id: `ph-${n}`,
  media_id: `m-${n}`,
  url: `https://cdn.test/${n}.jpg`,
  sort_order: n,
});
const rule = {
  id: "r-1",
  slot_type_id: "s-1",
  kind: "base",
  name: null,
  amount: 4_000_000,
  included_guests: null,
  extra_guest_amount: null,
  starts_on: null,
  ends_on: null,
  priority: 0,
  is_active: true,
  created_at: "2026-11-01T10:00:00.000Z",
  updated_at: "2026-11-01T10:00:00.000Z",
};

type Call = { url: string; method: string; body: unknown; auth: string | null };
let calls: Call[];

/** Stubs fetch with `respond` and records each request. */
function stub(respond: (url: string, method: string) => Response) {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const method = init.method ?? "GET";
      calls.push({
        url,
        method,
        body: typeof init.body === "string" ? JSON.parse(init.body) : undefined,
        auth: new Headers(init.headers).get("Authorization"),
      });
      return respond(url, method);
    }),
  );
}

async function load() {
  vi.resetModules();
  const session = await import("@/services/admin/admin-session");
  session.saveTokens({ access_token: "access-1", refresh_token: "refresh-1", expires_in: 900 });
  return {
    fleet: await import("@/services/admin/fleet.service"),
    pricing: await import("@/services/admin/pricing.service"),
    media: await import("@/services/admin/media.service"),
  };
}

beforeEach(() => vi.stubEnv("NEXT_PUBLIC_API_URL", API));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("yachts", () => {
  it("lists with the documented query and the admin token", async () => {
    const { fleet } = await load();
    stub(() => json({ items: [yacht], total: 1, page: 2, limit: 20 }));
    const list = await fleet.listYachts({
      page: 2,
      limit: 20,
      status: "active",
      visibility: "hidden",
      search: "azure",
    });
    expect(list.items[0]!.partner?.name).toBe("Coastal Co.");
    expect(calls[0]).toMatchObject({ method: "GET", auth: "Bearer access-1" });
    const url = new URL(calls[0]!.url);
    expect(url.pathname).toBe("/admin/yachts");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      page: "2",
      limit: "20",
      status: "active",
      visibility: "hidden",
      search: "azure",
    });
  });

  it("gets one yacht with photos", async () => {
    const { fleet } = await load();
    stub(() => json({ ...yacht, photos: [photo(0)] }));
    const detail = await fleet.getYacht(YACHT_ID);
    expect(detail.photos).toHaveLength(1);
    expect(calls[0]!.url).toBe(`${API}/admin/yachts/${YACHT_ID}`);
  });

  it("creates and patches with the given bodies", async () => {
    const { fleet } = await load();
    stub(() => json(yacht, 201));
    await fleet.createYacht({ name: "Azure 52", ownership_type: "own", capacity: 12 });
    await fleet.updateYacht(YACHT_ID, { suites: null, is_visible: true });
    expect(calls.map((c) => [c.method, c.url, c.body])).toEqual([
      ["POST", `${API}/admin/yachts`, { name: "Azure 52", ownership_type: "own", capacity: 12 }],
      ["PATCH", `${API}/admin/yachts/${YACHT_ID}`, { suites: null, is_visible: true }],
    ]);
  });

  it("activates, and deactivates returning the affected bookings", async () => {
    const { fleet } = await load();
    const booking = {
      id: "b-1",
      reference: "SM-24763",
      starts_at: "2026-11-06T04:30:00.000Z",
      ends_at: "2026-11-06T08:30:00.000Z",
      status: "confirmed",
    };
    stub((url) =>
      url.endsWith("/deactivate")
        ? json({ ...yacht, is_active: false, affected_bookings: [booking] })
        : json(yacht),
    );
    await fleet.activateYacht(YACHT_ID);
    const result = await fleet.deactivateYacht(YACHT_ID);
    expect(result.affected_bookings[0]!.reference).toBe("SM-24763");
    expect(calls.map((c) => [c.method, c.url, c.body])).toEqual([
      ["POST", `${API}/admin/yachts/${YACHT_ID}/activate`, undefined],
      ["POST", `${API}/admin/yachts/${YACHT_ID}/deactivate`, undefined],
    ]);
  });

  it("replaces the crew and sets or removes the commission", async () => {
    const { fleet } = await load();
    stub(() => json(yacht));
    await fleet.replaceCrew(YACHT_ID, [{ name: "Arun Nair", role: "Captain" }]);
    await fleet.replaceCrew(YACHT_ID, []);
    await fleet.setCommission(YACHT_ID, 12.5);
    await fleet.setCommission(YACHT_ID, null);
    expect(calls.map((c) => [c.method, c.url.replace(API, ""), c.body])).toEqual([
      ["PUT", `/admin/yachts/${YACHT_ID}/crew`, { crew: [{ name: "Arun Nair", role: "Captain" }] }],
      ["PUT", `/admin/yachts/${YACHT_ID}/crew`, { crew: [] }],
      ["PUT", `/admin/yachts/${YACHT_ID}/commission`, { commission_rate: 12.5 }],
      ["PUT", `/admin/yachts/${YACHT_ID}/commission`, { commission_rate: null }],
    ]);
  });

  it("keeps the backend code of a refusal", async () => {
    const { fleet } = await load();
    stub(() =>
      json(
        { statusCode: 409, code: "NOT_PUBLISHABLE", message: "A visible yacht needs a photo" },
        409,
      ),
    );
    await expect(fleet.activateYacht(YACHT_ID)).rejects.toMatchObject({
      status: 409,
      code: "NOT_PUBLISHABLE",
    });
  });
});

describe("photos", () => {
  it("attaches, reorders and deletes", async () => {
    const { fleet } = await load();
    stub((_url, method) =>
      method === "DELETE" ? new Response(null, { status: 204 }) : json([photo(1), photo(0)]),
    );
    await fleet.attachPhotos(YACHT_ID, ["m-0", "m-1"]);
    await fleet.reorderPhotos(YACHT_ID, ["ph-1", "ph-0"]);
    await fleet.deletePhoto(YACHT_ID, "ph-1");
    expect(calls.map((c) => [c.method, c.url.replace(API, ""), c.body])).toEqual([
      ["POST", `/admin/yachts/${YACHT_ID}/photos`, { media_ids: ["m-0", "m-1"] }],
      ["PATCH", `/admin/yachts/${YACHT_ID}/photos/order`, { photo_ids: ["ph-1", "ph-0"] }],
      ["DELETE", `/admin/yachts/${YACHT_ID}/photos/ph-1`, undefined],
    ]);
  });

  it("uploads a photo: upload ticket, then PUT to the signed link without the admin token", async () => {
    const { media } = await load();
    stub(() =>
      json({ media_id: "m-9", upload_url: "https://bucket.test/signed?x=1", expires_in: 900 }, 201),
    );
    const puts: { url: string; headers: Record<string, string>; body: unknown }[] = [];
    class FakeXhr {
      upload = { onprogress: null as ((e: ProgressEvent) => void) | null };
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      status = 0;
      private url = "";
      private headers: Record<string, string> = {};
      open(_method: string, url: string) {
        this.url = url;
      }
      setRequestHeader(name: string, value: string) {
        this.headers[name] = value;
      }
      send(body: unknown) {
        puts.push({ url: this.url, headers: this.headers, body });
        this.status = 200;
        this.onload?.();
      }
    }
    vi.stubGlobal("XMLHttpRequest", FakeXhr);

    const file = new File([new Uint8Array([0xff, 0xd8, 0xff, 0x00])], "deck.jpg", {
      type: "image/jpeg",
    });
    await expect(media.uploadYachtPhoto(file)).resolves.toBe("m-9");
    expect(calls[0]).toMatchObject({
      method: "POST",
      url: `${API}/admin/media/uploads`,
      auth: "Bearer access-1",
      body: {
        purpose: "yacht_photo",
        filename: "deck.jpg",
        content_type: "image/jpeg",
        size_bytes: 4,
      },
    });
    expect(puts).toEqual([
      {
        url: "https://bucket.test/signed?x=1",
        headers: { "Content-Type": "image/jpeg" },
        body: file,
      },
    ]);
  });

  it("rejects files the backend would refuse, before uploading", async () => {
    const { media } = await load();
    expect(media.yachtPhotoProblem(new File(["x"], "a.gif", { type: "image/gif" }))).toMatch(
      /JPEG, PNG or WebP/,
    );
    const big = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "big.png", { type: "image/png" });
    expect(media.yachtPhotoProblem(big)).toMatch(/10 MB/);
    expect(media.yachtPhotoProblem(new File(["x"], "ok.webp", { type: "image/webp" }))).toBeNull();
  });
});

describe("slot types and price rules", () => {
  it("gets and replaces the slot setup", async () => {
    const { fleet } = await load();
    const setup = {
      opens_at: "08:00",
      closes_at: "20:00",
      turnaround_minutes: 30,
      slot_types: [
        {
          id: "s-1",
          name: "4-hour",
          duration_minutes: 240,
          start_times: ["09:00"],
          sort_order: 0,
          is_active: true,
        },
      ],
    };
    stub(() => json(setup));
    await fleet.getSlotTypes(YACHT_ID);
    const input = {
      opens_at: "08:00",
      closes_at: "20:00",
      turnaround_minutes: 30,
      slot_types: [
        {
          id: "s-1",
          name: "4-hour",
          duration_minutes: 240,
          start_times: ["09:00", "14:00"],
          is_active: true,
        },
      ],
    };
    await fleet.replaceSlotTypes(YACHT_ID, input);
    expect(calls.map((c) => [c.method, c.url.replace(API, ""), c.body])).toEqual([
      ["GET", `/admin/yachts/${YACHT_ID}/slot-types`, undefined],
      ["PUT", `/admin/yachts/${YACHT_ID}/slot-types`, input],
    ]);
  });

  it("lists, creates, updates and deletes price rules", async () => {
    const { pricing } = await load();
    stub((url, method) =>
      method === "DELETE"
        ? new Response(null, { status: 204 })
        : method === "GET"
          ? json([rule])
          : json(rule, method === "POST" ? 201 : 200),
    );
    await pricing.listPriceRules(YACHT_ID, { kind: "base" });
    await pricing.createPriceRule(YACHT_ID, {
      slot_type_id: "s-1",
      kind: "base",
      amount: 4_000_000,
    });
    await pricing.updatePriceRule("r-1", { amount: 4_500_000, name: null });
    await pricing.deletePriceRule("r-1");
    expect(calls.map((c) => [c.method, c.url.replace(API, ""), c.body])).toEqual([
      ["GET", `/admin/yachts/${YACHT_ID}/price-rules?kind=base`, undefined],
      [
        "POST",
        `/admin/yachts/${YACHT_ID}/price-rules`,
        { slot_type_id: "s-1", kind: "base", amount: 4_000_000 },
      ],
      ["PATCH", "/admin/price-rules/r-1", { amount: 4_500_000, name: null }],
      ["DELETE", "/admin/price-rules/r-1", undefined],
    ]);
    expect(calls.every((c) => c.auth === "Bearer access-1")).toBe(true);
  });
});
