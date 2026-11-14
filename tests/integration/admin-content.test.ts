import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  isLink,
  isSlug,
  paragraphs,
  slugify,
  titleParts,
} from "@/features/admin/content/utils/content-format";

// Website content against a stubbed `fetch` (/admin/banners, /admin/pages, /admin/faqs).
const API = "http://api.test";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type Call = { url: string; method: string; body: unknown };
let calls: Call[];
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
      });
      return respond(url, method);
    }),
  );
}

async function load() {
  vi.resetModules();
  const session = await import("@/services/admin/admin-session");
  session.saveTokens({ access_token: "access-1", refresh_token: "refresh-1", expires_in: 900 });
  return import("@/services/admin/content.service");
}

beforeEach(() => vi.stubEnv("NEXT_PUBLIC_API_URL", API));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const banner = {
  id: "bn-1",
  title: "Your Kerala journey begins on the water",
  subtitle: "Let us create a journey around you.",
  media_id: "m-1",
  image_url: "https://img.test/b.jpg",
  link_url: "/plan-your-charter",
  is_published: false,
  sort_order: 0,
  created_at: "x",
  updated_at: "x",
};

describe("content service", () => {
  it("lists drafts and finds an item through its list", async () => {
    const svc = await load();
    stub(() => json({ items: [banner], total: 1, page: 1, limit: 100 }));
    await svc.listContent("banners", { page: 1, limit: 20, status: "draft" });
    expect((await svc.findContent("banners", "bn-1"))?.title).toMatch(/Kerala/);
    expect(await svc.findContent("banners", "nope")).toBeNull();
    expect(calls[0]?.url).toBe(`${API}/admin/banners?page=1&limit=20&status=draft`);
  });

  it("creates a page, publishes a banner and deletes an FAQ", async () => {
    const svc = await load();
    stub((url, method) => {
      if (method === "DELETE") return new Response(null, { status: 204 });
      if (url.includes("/pages"))
        return json(
          {
            id: "pg-1",
            slug: "terms",
            title: "Terms",
            summary: null,
            body: "",
            is_published: false,
            published_at: null,
            show_on_home: false,
            sort_order: 0,
            created_at: "x",
            updated_at: "x",
          },
          201,
        );
      return json({ ...banner, is_published: true });
    });
    await svc.createContent("pages", { slug: "terms", title: "Terms" });
    expect((await svc.updateContent("banners", "bn-1", { is_published: true })).is_published).toBe(
      true,
    );
    await svc.deleteContent("faqs", "fq-1");
    expect(calls.map((c) => [c.method, c.url.replace(API, ""), c.body])).toEqual([
      ["POST", "/admin/pages", { slug: "terms", title: "Terms" }],
      ["PATCH", "/admin/banners/bn-1", { is_published: true }],
      ["DELETE", "/admin/faqs/fq-1", undefined],
    ]);
  });
});

describe("content helpers", () => {
  it("makes web addresses and checks links", () => {
    expect(slugify("Terms & Conditions — 2026")).toBe("terms-conditions-2026");
    expect(slugify("Café cruises")).toBe("cafe-cruises");
    expect(isSlug("terms-and-conditions")).toBe(true);
    expect(isSlug("Terms")).toBe(false);
    expect(isLink("/plan-your-charter")).toBe(true);
    expect(isLink("https://sitharamarina.com/x")).toBe(true);
    expect(isLink("//evil.test")).toBe(false);
    expect(isLink("javascript:alert(1)")).toBe(false);
  });

  it("splits text into paragraphs and titles for the serif ending", () => {
    expect(paragraphs("One.\n\nTwo\nlines.\n\n\n")).toEqual(["One.", "Two\nlines."]);
    expect(titleParts("Your Kerala journey begins on the water.")).toEqual([
      "Your Kerala journey begins",
      "on the water.",
    ]);
    expect(titleParts("Short title")).toEqual(["Short title", ""]);
  });
});
