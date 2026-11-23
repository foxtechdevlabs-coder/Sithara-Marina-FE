import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The customer notification inbox against a stubbed `fetch`. Shapes follow the backend Swagger ("me").
const API = "http://api.test";

interface Call {
  url: string;
  method: string | undefined;
  headers: Headers;
  body: unknown;
}

const stub = (body: unknown, status = 200) => {
  const calls: Call[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    calls.push({
      url,
      method: init.method,
      headers: new Headers(init.headers),
      body: init.body ? JSON.parse(init.body as string) : undefined,
    });
    return new Response(JSON.stringify(body), { status });
  });
  return calls;
};

beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_URL", API);
  const { registerAuthHandlers } = await import("@/services/http/auth-handlers");
  registerAuthHandlers({
    getAccessToken: () => "customer-token",
    refresh: async () => false,
    onSessionExpired: () => {},
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
});

const service = () => import("@/services/user/notifications.service");

const NOTE = {
  id: "0b6f1c1e-2c1a-4c5e-9b7a-1f2e3d4c5b6a",
  type: "booking_confirmed",
  title: "Booking confirmed: SM-2026-0042",
  body: "Your charter on Aurora, Sun, 20 Dec 2026 at 09:00 is confirmed.",
  entity_type: "booking",
  entity_id: "7d1c2b3a-4e5f-4a6b-8c7d-9e0f1a2b3c4d",
  created_at: "2026-11-16T09:00:00.000Z",
  read_at: null,
};
const LIST = { items: [NOTE], total: 1, page: 1, limit: 20, unread_count: 3 };

describe("customer notifications service", () => {
  it("lists the first page with the customer's token", async () => {
    const calls = stub(LIST);
    const { listMyNotifications } = await service();
    const list = await listMyNotifications();
    expect(calls[0]?.url).toBe(`${API}/me/notifications?page=1&limit=20`);
    expect(calls[0]?.method ?? "GET").toBe("GET");
    expect(calls[0]?.headers.get("Authorization")).toBe("Bearer customer-token");
    expect(list).toEqual(LIST);
  });

  it("asks for a later page and unread only", async () => {
    const calls = stub({ ...LIST, page: 2 });
    const { listMyNotifications } = await service();
    await listMyNotifications({ page: 2, limit: 10, unreadOnly: true });
    expect(calls[0]?.url).toBe(`${API}/me/notifications?page=2&limit=10&unread_only=true`);
  });

  it("keeps a notification of a type it does not know yet", async () => {
    stub({ ...LIST, items: [{ ...NOTE, type: "something_new", entity_type: "voucher" }] });
    const { listMyNotifications } = await service();
    const list = await listMyNotifications();
    expect(list.items[0]?.type).toBe("something_new");
  });

  it("reads the unread count for the badge", async () => {
    const calls = stub({ unread_count: 7 });
    const { getMyUnreadNotificationCount } = await service();
    expect(await getMyUnreadNotificationCount()).toBe(7);
    expect(calls[0]?.url).toBe(`${API}/me/notifications/unread-count`);
  });

  it("marks given notifications read", async () => {
    const calls = stub({ marked: 1, unread_count: 2 });
    const { markMyNotificationsRead } = await service();
    expect(await markMyNotificationsRead({ ids: [NOTE.id] })).toEqual({
      marked: 1,
      unread_count: 2,
    });
    expect(calls[0]?.url).toBe(`${API}/me/notifications/read`);
    expect(calls[0]?.method).toBe("POST");
    expect(calls[0]?.body).toEqual({ ids: [NOTE.id] });
  });

  it("marks all read", async () => {
    const calls = stub({ marked: 3, unread_count: 0 });
    const { markMyNotificationsRead } = await service();
    await markMyNotificationsRead({ all: true });
    expect(calls[0]?.body).toEqual({ all: true });
  });

  it("never sends more ids than the backend accepts", async () => {
    const calls = stub({ marked: 0, unread_count: 0 });
    const { markMyNotificationsRead, MARK_READ_MAX_IDS } = await service();
    const ids = Array.from({ length: 150 }, (_, i) => `id-${i}`);
    await markMyNotificationsRead({ ids });
    expect((calls[0]?.body as { ids: string[] }).ids).toHaveLength(MARK_READ_MAX_IDS);
  });

  it("surfaces a 403 for a staff account", async () => {
    stub({ statusCode: 403, message: "Forbidden" }, 403);
    const { getMyUnreadNotificationCount } = await service();
    await expect(getMyUnreadNotificationCount()).rejects.toMatchObject({ status: 403 });
  });
});

describe("opening a booking from a notification", () => {
  it("turns the booking id into its reference first", async () => {
    const urls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      urls.push(url);
      if (url.endsWith(`/bookings/${NOTE.entity_id}`)) {
        return new Response(JSON.stringify({ reference: "SM-2026-0042" }), { status: 200 });
      }
      return new Response(JSON.stringify({ message: "stop here" }), { status: 404 });
    });
    const { getMyBookingByIdOrReference } =
      await import("@/services/user/customer-bookings.service");
    // The stubbed /bookings/{id} answer is partial, so validation stops it; only the URLs matter.
    await getMyBookingByIdOrReference(NOTE.entity_id).catch(() => {});
    expect(urls[0]).toBe(`${API}/bookings/${NOTE.entity_id}`);
  });

  it("uses a reference as is", async () => {
    const calls = stub({}, 404);
    const { getMyBookingByIdOrReference } =
      await import("@/services/user/customer-bookings.service");
    await getMyBookingByIdOrReference("SM-2026-0042").catch(() => {});
    expect(calls[0]?.url).toBe(`${API}/me/bookings/SM-2026-0042`);
  });
});
