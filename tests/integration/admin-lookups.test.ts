import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Option loaders of the admin combo boxes, against a stubbed `fetch`: each
// search must hit the list endpoint with `search` and a small page.
const API = "http://api.test";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const yacht = (id: string, name: string, active = true) => ({
  id,
  name,
  slug: id,
  ownership_type: "partner",
  partner: { id: "p-1", name: "Coastal Charters Co." },
  commission_rate: null,
  registration_number: null,
  built_year: null,
  refit_year: null,
  cruising_speed_kmh: null,
  card_tagline: null,
  hourly_rate: null,
  cruising_regions: [],
  type: null,
  length_ft: null,
  capacity: 10,
  suites: null,
  description: null,
  departure_city: null,
  departure_points: [],
  amenities: [],
  inclusions: [],
  crew: [],
  policies: null,
  booking_mode: "instant",
  enquiry_enabled: false,
  opens_at: null,
  closes_at: null,
  turnaround_minutes: 30,
  is_active: active,
  is_visible: true,
  is_featured: false,
  created_at: "2026-11-01T10:00:00.000Z",
  updated_at: "2026-11-01T10:00:00.000Z",
});

let urls: string[];
function stub(respond: (url: string) => Response) {
  urls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      urls.push(url);
      return respond(url);
    }),
  );
}

async function load() {
  vi.resetModules();
  const session = await import("@/services/admin/admin-session");
  session.saveTokens({ access_token: "access-1", refresh_token: "refresh-1", expires_in: 900 });
  return import("@/components/admin/lookups");
}

beforeEach(() => vi.stubEnv("NEXT_PUBLIC_API_URL", API));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("combo box lookups", () => {
  it("searches yachts on the server, one small page, active first", async () => {
    const lookups = await load();
    stub(() =>
      json({
        items: [yacht("y-2", "Zephyr", false), yacht("y-1", "Malabar")],
        total: 640,
        page: 1,
        limit: 20,
      }),
    );
    const signal = new AbortController().signal;
    const result = await lookups.searchYachts({ ownership: "partner" })("mal", signal);
    expect(urls[0]).toBe(`${API}/admin/yachts?ownership=partner&limit=20&search=mal`);
    expect(result.options.map((o) => o.label)).toEqual(["Malabar", "Zephyr (inactive)"]);
    expect(result.options[0]?.description).toBe("Coastal Charters Co. · 10 guests");
    expect(result.hasMore).toBe(true);
  });

  it("loads the first page without a search", async () => {
    const lookups = await load();
    stub(() => json({ items: [], total: 0, page: 1, limit: 20 }));
    const result = await lookups.searchPartners({ status: "active" })(
      "",
      new AbortController().signal,
    );
    expect(urls[0]).toBe(`${API}/admin/partners?status=active&limit=20`);
    expect(result).toEqual({ options: [], hasMore: false });
  });

  it("resolves the label of a selected id it hasn't loaded", async () => {
    const lookups = await load();
    stub(() => json({ ...yacht("y-9", "Neelam"), photos: [] }));
    const option = await lookups.resolveYacht("y-9", new AbortController().signal);
    expect(urls[0]).toBe(`${API}/admin/yachts/y-9`);
    expect(option).toMatchObject({ value: "y-9", label: "Neelam" });
  });

  it("searches customers by name, email or phone", async () => {
    const lookups = await load();
    stub(() =>
      json({
        items: [
          {
            id: "c-1",
            full_name: "Ananya Menon",
            email: "ananya@example.com",
            phone: "+919800000000",
            is_active: true,
            email_verified_at: null,
            last_login_at: null,
            booking_count: 2,
            created_at: "x",
            updated_at: "x",
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      }),
    );
    const result = await lookups.searchCustomerRecords()("ananya", new AbortController().signal);
    expect(urls[0]).toBe(`${API}/admin/customers?limit=20&sort=name&search=ananya`);
    expect(result.options[0]).toMatchObject({
      label: "Ananya Menon",
      description: "ananya@example.com · +919800000000",
    });
  });
});
