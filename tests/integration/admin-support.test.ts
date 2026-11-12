import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  categoryLabel,
  messagePreview,
  replyLink,
} from "@/features/admin/support/utils/support-format";

// Support requests against a stubbed `fetch` (/admin/support-requests).
const API = "http://api.test";

const request = {
  id: "sr-1",
  reference: "SUP-2026-0001",
  subject: "Change of guest count",
  message: "We are now 8 people.\n\nCan the yacht take us?",
  category: "booking",
  booking_reference: "SM-2026-0042",
  status: "submitted",
  created_at: "2026-11-10T09:00:00.000Z",
  customer: { id: "c-1", name: "Anu Varghese", email: "anu@example.com" },
  booking_id: "b-1",
};

let calls: { url: string; auth: string | null }[];
function stub(body: unknown, status = 200) {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit = {}) => {
      calls.push({ url, auth: new Headers(init.headers).get("Authorization") });
      return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
}

async function load() {
  vi.resetModules();
  const session = await import("@/services/admin/admin-session");
  session.saveTokens({ access_token: "access-1", refresh_token: "refresh-1", expires_in: 900 });
  return import("@/services/admin/support.service");
}

beforeEach(() => vi.stubEnv("NEXT_PUBLIC_API_URL", API));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("support service", () => {
  it("lists with filters and reads one request, as staff", async () => {
    const svc = await load();
    stub({ items: [request], total: 1, page: 1, limit: 20 });
    const list = await svc.listSupportRequests({
      page: 1,
      limit: 20,
      search: "anu",
      category: "booking",
    });
    expect(list.items[0]?.customer.email).toBe("anu@example.com");
    stub(request);
    expect((await svc.getSupportRequest("sr-1")).reference).toBe("SUP-2026-0001");
    expect(calls[0]).toEqual({
      url: `${API}/admin/support-requests/sr-1`,
      auth: "Bearer access-1",
    });
  });

  it("rejects a response that breaks the contract", async () => {
    const svc = await load();
    stub({ ...request, customer: null });
    await expect(svc.getSupportRequest("sr-1")).rejects.toMatchObject({ kind: "validation" });
  });
});

describe("support wording", () => {
  it("labels, previews and builds the reply link", () => {
    expect(categoryLabel("refund")).toBe("Refund");
    expect(categoryLabel(null)).toBe("No category");
    expect(messagePreview("a  b\n\nc")).toBe("a b c");
    expect(messagePreview("x".repeat(200), 10)).toBe(`${"x".repeat(9)}…`);
    expect(replyLink(request)).toBe(
      "mailto:anu%40example.com?subject=Re%3A%20Change%20of%20guest%20count%20%5BSUP-2026-0001%5D",
    );
  });
});
