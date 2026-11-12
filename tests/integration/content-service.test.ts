import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The public content API against a stubbed `fetch`. Shapes follow the backend
// Swagger contract for /content/home, /content/pages/{slug}, /content/faqs and
// /content/banners.
const API = "http://api.test";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const HOME = {
  featured_yachts: [
    { id: "y1", name: "Astra One", slug: "astra-one", capacity: 12, image_url: null, starting_price: 600000 },
  ],
  banners: [{ id: "b1", title: "Monsoon", subtitle: null, image_url: null, link_url: "/yachts" }],
  sections: [{ slug: "our-story", title: "Our story", summary: null }],
  pages: [{ slug: "our-story", title: "Our story" }],
};

const faq = (n: number) => ({ id: `f${n}`, question: `Q${n}?`, answer: `A${n}.`, category: n % 2 ? "Booking" : null });

/** Routes each request by path and records it. */
function stub(handler: (url: URL) => Response) {
  const calls: { path: string; query: string; bearer: string | null; cache: unknown }[] = [];
  vi.stubGlobal("fetch", async (input: string, init: RequestInit & { next?: unknown }) => {
    const url = new URL(input);
    calls.push({
      path: url.pathname,
      query: url.search,
      bearer: new Headers(init.headers).get("Authorization"),
      cache: init.next,
    });
    return handler(url);
  });
  return calls;
}

const load = async () => {
  vi.resetModules();
  return {
    ...(await import("@/services/user/content.service")),
    ...(await import("@/services/http/api-error")),
  };
};

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", API);
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("content service", () => {
  it("reads the home content publicly, reused by the server for a minute", async () => {
    const { getHomeContent } = await load();
    const calls = stub(() => json(HOME));
    await expect(getHomeContent()).resolves.toEqual(HOME);
    expect(calls).toEqual([{ path: "/content/home", query: "", bearer: null, cache: { revalidate: 60 } }]);
  });

  it("rejects a home answer that breaks the contract", async () => {
    const { getHomeContent } = await load();
    stub(() => json({ ...HOME, featured_yachts: [{ id: "y1" }] }));
    await expect(getHomeContent()).rejects.toMatchObject({ kind: "validation" });
  });

  it("reads a page by its encoded slug, and surfaces 404 for an unpublished one", async () => {
    const { getContentPage, isApiError } = await load();
    const page = { slug: "a b", title: "T", summary: null, body: "", updated_at: "2026-11-12T09:02:46.157Z" };
    const calls = stub((url) =>
      url.pathname === "/content/pages/a%20b" ? json(page) : json({ statusCode: 404, message: "Not Found" }, 404),
    );
    await expect(getContentPage("a b")).resolves.toEqual(page);
    const error = await getContentPage("missing").catch((e: unknown) => e);
    expect(isApiError(error) && error.status).toBe(404);
    expect(calls.map((c) => c.path)).toEqual(["/content/pages/a%20b", "/content/pages/missing"]);
  });

  it("pages FAQs with the backend's page and limit", async () => {
    const { listFaqs } = await load();
    const calls = stub(() => json({ items: [faq(1)], total: 1, page: 2, limit: 5 }));
    await expect(listFaqs({ page: 2, limit: 5 })).resolves.toMatchObject({ items: [faq(1)], page: 2 });
    expect(calls[0]?.query).toBe("?page=2&limit=5");
  });

  it("reads every FAQ across pages, in order, and stops at the total", async () => {
    const { listAllFaqs } = await load();
    const all = Array.from({ length: 25 }, (_, i) => faq(i + 1));
    const calls = stub((url) => {
      const page = Number(url.searchParams.get("page"));
      return json({ items: all.slice((page - 1) * 20, page * 20), total: 25, page, limit: 20 });
    });
    const faqs = await listAllFaqs();
    expect(faqs.map((f) => f.id)).toEqual(all.map((f) => f.id));
    expect(calls.map((c) => c.query)).toEqual(["?page=1&limit=20", "?page=2&limit=20"]);
  });

  it("returns no FAQs (not an error) when none are published", async () => {
    const { listAllFaqs } = await load();
    stub(() => json({ items: [], total: 0, page: 1, limit: 20 }));
    await expect(listAllFaqs()).resolves.toEqual([]);
  });

  it("lists banners, handling an empty answer and errors", async () => {
    const { listBanners } = await load();
    let answer = json({ items: HOME.banners, total: 1, page: 1, limit: 20 });
    const calls = stub(() => answer);
    await expect(listBanners({ page: 1, limit: 20 })).resolves.toMatchObject({ items: HOME.banners, total: 1 });
    expect(calls[0]).toMatchObject({ path: "/content/banners", query: "?page=1&limit=20", bearer: null });

    answer = json({ items: [], total: 0, page: 1, limit: 20 });
    await expect(listBanners()).resolves.toMatchObject({ items: [], total: 0 });

    answer = json({ statusCode: 503, message: "Unavailable" }, 503);
    await expect(listBanners()).rejects.toMatchObject({ status: 503 });
  });

  it("only treats same-site paths and http(s) addresses as banner links", async () => {
    const { safeBannerLink } = await load();
    expect(safeBannerLink("/yachts")).toBe("/yachts");
    expect(safeBannerLink("https://example.com/offer")).toBe("https://example.com/offer");
    expect(safeBannerLink(null)).toBeNull();
    expect(safeBannerLink("  ")).toBeNull();
    expect(safeBannerLink("javascript:alert(1)")).toBeNull();
    expect(safeBannerLink("//evil.example")).toBeNull();
    expect(safeBannerLink("data:text/html,hi")).toBeNull();
  });
});
