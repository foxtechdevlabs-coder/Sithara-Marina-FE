import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Yacht service against a stubbed `fetch`. Shapes follow the backend Swagger schemas.
const API = "http://api.test";

const stub = (body: unknown, status = 200) => {
  const calls: { url: string; authorization: string | null }[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    calls.push({ url, authorization: new Headers(init.headers).get("Authorization") });
    return new Response(JSON.stringify(body), { status });
  });
  return calls;
};

const load = () => import("@/services/user/yachts.service");

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_URL", API);
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("listYachts", () => {
  it("sends only the given filters, publicly, with paise unchanged", async () => {
    const { listYachts } = await load();
    const calls = stub({ items: [], total: 0, page: 2, limit: 20 });

    await listYachts({ page: 2, limit: 20, min_price: 100000, destination: "Kochi" });

    expect(calls).toEqual([
      {
        url: `${API}/yachts?page=2&limit=20&min_price=100000&destination=Kochi`,
        authorization: null,
      },
    ]);
  });

  it("rejects a response that breaks the contract", async () => {
    const { listYachts } = await load();
    stub({ items: "nope" });

    await expect(listYachts()).rejects.toMatchObject({ kind: "validation" });
  });

  it("exposes INVALID_FILTER", async () => {
    const { listYachts } = await load();
    stub({ statusCode: 400, code: "INVALID_FILTER", message: "Past date" }, 400);

    const error = await listYachts({ date: "2000-01-01" }).catch((caught: unknown) => caught);
    expect(error).toMatchObject({ status: 400, kind: "http" });
    expect((error as { code?: string }).code).toBe("INVALID_FILTER");
  });
});

describe("slug requests", () => {
  it("encodes the slug and passes the query", async () => {
    const { getYachtSlots } = await load();
    const calls = stub({
      date: "2030-01-15",
      timezone: "Asia/Kolkata",
      date_status: "available",
      currency: "INR",
      slots: [],
    });

    await getYachtSlots("a b", { date: "2030-01-15", guests: 4 });

    expect(calls[0]?.url).toBe(`${API}/yachts/a%20b/slots?date=2030-01-15&guests=4`);
  });

  it("accepts a slot with a null price", async () => {
    const { getYachtSlots } = await load();
    stub({
      date: "2030-01-15",
      timezone: "Asia/Kolkata",
      date_status: "partly_available",
      currency: "INR",
      slots: [
        {
          slot_type_id: "1",
          slot_type_name: "Four hours",
          start_time: "10:00",
          end_time: "14:00",
          starts_at: "2030-01-15T04:30:00.000Z",
          ends_at: "2030-01-15T08:30:00.000Z",
          state: "available",
          price: null,
          included_guests: null,
          extra_guest_amount: null,
        },
      ],
    });

    const result = await getYachtSlots("test", { date: "2030-01-15" });
    expect(result.slots[0]?.price).toBeNull();
  });

  it("reports an unknown yacht as a 404", async () => {
    const { getYacht } = await load();
    stub({ statusCode: 404, code: "YACHT_NOT_FOUND", message: "Yacht not found" }, 404);

    await expect(getYacht("missing")).rejects.toMatchObject({ status: 404 });
  });
});
