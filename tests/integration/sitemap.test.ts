import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The sitemap against a stubbed `fetch`. It runs during `next build`.
const card = (slug: string) => ({
  id: `id-${slug}`,
  slug,
  name: slug,
  type: null,
  length_ft: null,
  suites: null,
  capacity: 8,
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

async function yachtUrls() {
  const { default: sitemap } = await import("@/app/sitemap");
  const entries = await sitemap();
  return entries.map((e) => new URL(e.url).pathname).filter((p) => p.startsWith("/yachts/"));
}

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test");
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("sitemap", () => {
  it("lists every yacht by slug, across pages", async () => {
    const slugs = Array.from({ length: 150 }, (_, i) => `yacht-${i}`);
    const fetchMock = vi.fn(async (url: string) => {
      const page = Number(new URL(url).searchParams.get("page"));
      const items = slugs.slice((page - 1) * 100, page * 100).map(card);
      return new Response(JSON.stringify({ items, total: slugs.length, page, limit: 100 }));
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(yachtUrls()).resolves.toEqual(slugs.map((s) => `/yachts/${s}`));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("still builds, with the static pages, when the API is down", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    const { default: sitemap } = await import("@/app/sitemap");

    const paths = (await sitemap()).map((e) => new URL(e.url).pathname);
    expect(paths).toEqual(["/", "/yachts", "/plan-your-charter"]);
  });
});
