import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Settings, staff and roles against a stubbed `fetch`. Paths, methods and bodies
// follow the backend OpenAPI contract for /admin/settings, /admin/staff/* and /admin/roles/*.
const API = "http://api.test";

function json(body: unknown, status = 200) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const settings = {
  gst_rate: 18,
  tax_label: "GST",
  weekend_days: ["sat", "sun"],
  booking_horizon_days: null,
  timezone: "Asia/Kolkata",
  cancellation_summary: null,
  contact_email: null,
  contact_phone: null,
  contact_address: null,
  earliest_start_time: "05:00",
  latest_end_time: "19:00",
};
const person = {
  id: "s-1",
  email: "neha@sithara.test",
  full_name: "Neha P.",
  role: "admin",
  staff_role: null,
  is_active: true,
  last_login_at: null,
  created_at: "2026-11-01T10:00:00.000Z",
  updated_at: "2026-11-01T10:00:00.000Z",
};
const role = {
  id: "r-1",
  key: null,
  name: "Concierge",
  description: null,
  permissions: ["bookings:read"],
  account_count: 0,
};

type Call = { url: string; method: string; body: unknown; auth: string | null };
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
    settings: await import("@/services/admin/settings.service"),
    staff: await import("@/services/admin/staff.service"),
  };
}

const sent = () => calls.map((c) => [c.method, c.url.replace(API, ""), c.body]);

beforeEach(() => vi.stubEnv("NEXT_PUBLIC_API_URL", API));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("settings", () => {
  it("reads and updates with the session token", async () => {
    const api = await load();
    stub(() => json(settings));
    await api.settings.getSettings();
    await api.settings.updateSettings({ gst_rate: null });
    expect(sent()).toEqual([
      ["GET", "/admin/settings", undefined],
      ["PUT", "/admin/settings", { gst_rate: null }],
    ]);
    expect(calls[1]?.auth).toBe("Bearer access-1");
  });
});

describe("staff", () => {
  it("lists, invites and changes accounts", async () => {
    const api = await load();
    stub((url, method) =>
      method === "GET"
        ? json({ items: [person], total: 1, page: 1, limit: 20 })
        : url.endsWith("/admin/staff")
          ? json({ ...person, invite_sent: false }, 201)
          : json(person),
    );
    await api.staff.listStaff({ page: 1, limit: 20 });
    const invited = await api.staff.inviteStaff({
      email: "dev@sithara.test",
      full_name: "Dev R.",
      role: "admin",
      staff_role_id: "r-1",
    });
    expect(invited.invite_sent).toBe(false);
    await api.staff.updateStaff("s-1", { full_name: "Neha" });
    await api.staff.deactivateStaff("s-1");
    await api.staff.reactivateStaff("s-1");
    expect(sent()).toEqual([
      ["GET", "/admin/staff?page=1&limit=20", undefined],
      [
        "POST",
        "/admin/staff",
        { email: "dev@sithara.test", full_name: "Dev R.", role: "admin", staff_role_id: "r-1" },
      ],
      ["PATCH", "/admin/staff/s-1", { full_name: "Neha" }],
      ["POST", "/admin/staff/s-1/deactivate", undefined],
      ["POST", "/admin/staff/s-1/reactivate", undefined],
    ]);
  });
});

describe("roles", () => {
  it("lists built-in roles with no id, and changes custom ones", async () => {
    const api = await load();
    stub((_url, method) =>
      method === "GET"
        ? json([{ ...role, id: null, key: "super_admin", name: "Super Admin" }, role])
        : method === "DELETE"
          ? json(undefined, 204)
          : json(role),
    );
    const roles = await api.staff.listRoles();
    expect(roles[0]).toMatchObject({ id: null, key: "super_admin" });
    await api.staff.createRole({ name: "Desk", description: null, permissions: ["cms:read"] });
    await api.staff.updateRole("r-1", { permissions: [] });
    await api.staff.deleteRole("r-1");
    expect(sent()).toEqual([
      ["GET", "/admin/roles", undefined],
      ["POST", "/admin/roles", { name: "Desk", description: null, permissions: ["cms:read"] }],
      ["PATCH", "/admin/roles/r-1", { permissions: [] }],
      ["DELETE", "/admin/roles/r-1", undefined],
    ]);
  });
});
