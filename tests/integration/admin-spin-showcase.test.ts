import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The 360° showcase against a stubbed `fetch`, following the backend OpenAPI
// contract for /admin/content/spin-showcase and GET /admin/yachts?has_spin.
const API = "http://api.test";
const showcase = {
  items: [
    {
      yacht: { id: "y-1", name: "Astra One", slug: "astra-one", partner: null },
      is_active: true,
      is_visible: true,
      has_spin: true,
      shown_on_site: true,
      preview_url: "https://cdn.test/1.jpg",
    },
  ],
  max: 5,
  updated_at: null,
  updated_by: null,
};

let calls: { url: string; method: string; body: unknown; auth: string | null }[];
function stub(body: unknown) {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit = {}) => {
      calls.push({
        url,
        method: init.method ?? "GET",
        body: typeof init.body === "string" ? JSON.parse(init.body) : undefined,
        auth: new Headers(init.headers).get("Authorization"),
      });
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
}

async function load() {
  vi.resetModules();
  const session = await import("@/services/admin/admin-session");
  session.saveTokens({ access_token: "access-1", refresh_token: "refresh-1", expires_in: 900 });
  return {
    content: await import("@/services/admin/content.service"),
    fleet: await import("@/services/admin/fleet.service"),
  };
}

beforeEach(() => vi.stubEnv("NEXT_PUBLIC_API_URL", API));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("360° showcase", () => {
  it("reads and replaces the list with the admin token", async () => {
    const { content } = await load();
    stub(showcase);
    const read = await content.getSpinShowcase();
    expect(read.max).toBe(5);
    await content.updateSpinShowcase(["y-2", "y-1"]);
    await content.updateSpinShowcase([]);
    expect(calls.map((c) => [c.method, c.url.replace(API, ""), c.body])).toEqual([
      ["GET", "/admin/content/spin-showcase", undefined],
      ["PUT", "/admin/content/spin-showcase", { yacht_ids: ["y-2", "y-1"] }],
      ["PUT", "/admin/content/spin-showcase", { yacht_ids: [] }],
    ]);
    expect(calls[1]?.auth).toBe("Bearer access-1");
  });

  it("asks only for yachts that can be shown", async () => {
    const { fleet } = await load();
    stub({ items: [], total: 0, page: 1, limit: 20 });
    await fleet.listYachts({ status: "active", visibility: "visible", has_spin: true, limit: 20 });
    expect(calls[0]?.url).toBe(
      `${API}/admin/yachts?status=active&visibility=visible&has_spin=true&limit=20`,
    );
  });
});
