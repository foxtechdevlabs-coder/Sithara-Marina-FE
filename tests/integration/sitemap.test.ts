import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The sitemap against a stubbed `fetch`. Card shapes follow the backend Swagger schema.
const API = "http://api.test";

const card = (slug: string) => ({
  id: `id-${slug}`,
  slug,
  name: slug,
  type: null,
  length_ft: null,
  suites: null,
  capacity: 10,
  departure_city: null,
  card_tagline: null,
  cruising_regions: [],
  primary_image_url: null,
  starting_price: null,
  currency: "INR",
  available_on_date: null,
  booking_mode: "instant",
  enquiry_enabled: false,
});

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_URL", API);
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://site.test");
});
afterEach(() => {
  vi.unstubAllEnvs();
});

const load = async () => (await import("@/app/sitemap")).default;

describe("sitemap", () => {
  it("lists the static pages and every published yacht by slug, across pages", async () => {
    const pages: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      const page = new URL(url).searchParams.get("page") ?? "1";
      pages.push(page);
      const items =
        page === "1" ? Array.from({ length: 100 }, (_, i) => card(`yacht-${i}`)) : [card("last-one")];
      return new Response(JSON.stringify({ items, total: 101, page: Number(page), limit: 100 }));
    });

    const entries = await (await load())();
    const urls = entries.map((entry) => entry.url);

    expect(urls.slice(0, 3)).toEqual([
      "https://site.test",
      "https://site.test/yachts",
      "https://site.test/plan-your-charter",
    ]);
    expect(urls).toContain("https://site.test/yachts/yacht-0");
    expect(urls).toContain("https://site.test/yachts/last-one");
    expect(urls).toHaveLength(3 + 101);
    expect(pages).toEqual(["1", "2"]);
  });

  it("keeps only one entry per yacht URL and encodes slugs", async () => {
    vi.stubGlobal(
      "fetch",
      async () =>
        new Response(
          JSON.stringify({ items: [card("a b"), card("a b"), card("c")], total: 3, page: 1, limit: 100 }),
        ),
    );
    const urls = (await (await load())()).map((entry) => entry.url);
    expect(urls.filter((url) => url === "https://site.test/yachts/a%20b")).toHaveLength(1);
    expect(urls).toHaveLength(5);
  });

  it("still serves the static pages when the backend is unavailable, inventing nothing", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("fetch failed");
    });
    const entries = await (await load())();
    expect(entries.map((entry) => entry.url)).toEqual([
      "https://site.test",
      "https://site.test/yachts",
      "https://site.test/plan-your-charter",
    ]);
  });
});
