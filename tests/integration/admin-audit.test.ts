import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  actionText,
  changedFields,
  shortRecord,
  valueText,
  whenText,
} from "@/features/admin/audit/utils/audit-format";

// Audit history against a stubbed `fetch` (GET /admin/audit-logs, /admin/audit-logs/{id}).
const API = "http://api.test";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

let urls: string[];
function stub(respond: () => Response) {
  urls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      urls.push(url);
      return respond();
    }),
  );
}

async function load() {
  vi.resetModules();
  const session = await import("@/services/admin/admin-session");
  session.saveTokens({ access_token: "access-1", refresh_token: "refresh-1", expires_in: 900 });
  return import("@/services/admin/audit.service");
}

beforeEach(() => vi.stubEnv("NEXT_PUBLIC_API_URL", API));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const entry = {
  id: "a-1",
  actor: { id: "s-1", full_name: "Anjali Krishnan", email: "anjali@x.test" },
  action: "yacht.update",
  entity_type: "yacht",
  entity_id: "11111111-2222-4333-8444-555555555555",
  created_at: "2026-10-25T08:50:00.000Z",
};

describe("audit service", () => {
  it("lists entries with filters", async () => {
    const audit = await load();
    stub(() =>
      json({ items: [entry, { ...entry, id: "a-2", actor: null }], total: 2, page: 1, limit: 25 }),
    );
    const list = await audit.listAuditLogs({
      page: 1,
      limit: 25,
      actor_id: "s-1",
      from: "2026-10-01",
      entity_type: "yacht",
    });
    expect(list.items[1]?.actor).toBeNull();
    expect(urls[0]).toBe(
      `${API}/admin/audit-logs?page=1&limit=25&actor_id=s-1&from=2026-10-01&entity_type=yacht`,
    );
  });

  it("reads an entry with before and after", async () => {
    const audit = await load();
    stub(() => json({ ...entry, before: { name: "Astra" }, after: { name: "Astra One" } }));
    const d = await audit.getAuditLog("a-1");
    expect(d.after).toEqual({ name: "Astra One" });
    expect(urls[0]).toBe(`${API}/admin/audit-logs/a-1`);
  });
});

describe("audit wording", () => {
  it("words actions", () => {
    expect(actionText("yacht.update")).toBe("Updated yacht");
    expect(actionText("price_rule.create")).toBe("Created price rule");
    expect(actionText("booking.price_override")).toBe("Booking: price override");
    expect(actionText("login")).toBe("Login");
  });

  it("lists only changed fields, money in rupees", () => {
    const changes = changedFields(
      { name: "Astra", amount: 4_000_000, updated_at: "a", capacity: 10 },
      { name: "Astra One", amount: 4_200_000, updated_at: "b", capacity: 10 },
    );
    expect(changes.map((c) => c.field)).toEqual(["amount", "name"]);
    expect(valueText("amount", 4_200_000)).toBe("₹ 42,000");
    expect(valueText("hourly_rate", 1_200_000)).toBe("₹ 12,000");
    expect(valueText("commission_rate", 15)).toBe("15");
    expect(valueText("is_active", false)).toBe("No");
    expect(valueText("note", null)).toBe("—");
    expect(changedFields(null, { name: "New" })).toEqual([
      { field: "name", before: undefined, after: "New" },
    ]);
  });

  it("formats times in the marina's zone and short records", () => {
    expect(whenText("2026-10-25T08:50:00.000Z", new Date("2026-11-10T00:00:00Z"))).toBe(
      "25 Oct · 14:20",
    );
    expect(whenText("2025-10-25T08:50:00.000Z", new Date("2026-11-10T00:00:00Z"))).toBe(
      "25 Oct 2025 · 14:20",
    );
    expect(shortRecord("price_rule", "3f2a9c1e-0000")).toBe("Price rule · 3f2a9c1e");
  });
});
