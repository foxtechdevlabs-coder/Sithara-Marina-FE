import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { alertHref, timeAgo } from "@/features/admin/notifications/utils/notification-format";

// Alerts, email log and templates against a stubbed `fetch`, following the
// backend contract (/admin/notifications, /admin/email-log, /admin/notification-templates).
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
  return import("@/services/admin/notifications.service");
}

beforeEach(() => vi.stubEnv("NEXT_PUBLIC_API_URL", API));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const alert = {
  id: "al-1",
  type: "refund_failed",
  severity: "critical",
  title: "Refund failed: SM-2026-0042",
  body: "The bank declined the refund.",
  entity_type: "booking",
  entity_id: "b-42",
  created_at: "2026-11-12T08:00:00.000Z",
  read_at: null,
};
const template = {
  key: "booking_confirmed",
  name: "Booking confirmed",
  description: "Sent to the customer when payment is confirmed",
  audience: "customer",
  channel: "email",
  is_customised: false,
  updated_at: null,
  updated_by_id: null,
  subject: "Booking confirmed: {{booking_reference}}",
  heading: "Your charter is confirmed",
  body: "Hello {{ customer_name }}",
  variables: [
    {
      name: "booking_reference",
      description: "The reference",
      required: true,
      kind: "text",
      sample: "SM-2026-0042",
    },
  ],
  defaults: {
    subject: "Booking confirmed: {{booking_reference}}",
    heading: "Your charter is confirmed",
    body: "Hello",
  },
};

describe("alerts", () => {
  it("lists unread alerts with the badge count and marks them read", async () => {
    const svc = await load();
    stub((url) =>
      url.includes("/read")
        ? json({ marked: 1, unread_count: 0 })
        : json({ items: [alert], total: 1, page: 1, limit: 8, unread_count: 3 }),
    );
    const list = await svc.listAlerts({ limit: 8, unread_only: true });
    expect(list.unread_count).toBe(3);
    await svc.markAlertsRead({ ids: ["al-1"] });
    await svc.markAlertsRead({ all: true });
    expect(calls.map((c) => [c.method, c.url.replace(API, ""), c.body])).toEqual([
      ["GET", "/admin/notifications?limit=8&unread_only=true", undefined],
      ["POST", "/admin/notifications/read", { ids: ["al-1"] }],
      ["POST", "/admin/notifications/read", { all: true }],
    ]);
  });

  it("gets a stream token and builds the stream address", async () => {
    const svc = await load();
    stub(() => json({ token: "tok-1", expires_in: 60 }));
    const { token } = await svc.getStreamToken();
    expect(calls[0]).toMatchObject({
      method: "POST",
      url: `${API}/admin/notifications/stream-token`,
    });
    expect(svc.streamUrl(token)).toBe(`${API}/admin/notifications/stream?token=tok-1`);
  });
});

describe("email log and templates", () => {
  it("filters the log and resends a failed email", async () => {
    const svc = await load();
    const email = {
      id: "m-1",
      template_key: "booking_confirmed",
      recipient: "a@x.test",
      subject: "S",
      status: "failed",
      attempts: 3,
      last_error: "SmtpError",
      entity_type: "booking",
      entity_id: "b-1",
      sent_at: null,
      next_attempt_at: null,
      created_at: "x",
    };
    stub((url) =>
      url.endsWith("/resend")
        ? json({ ...email, status: "queued" })
        : json({ items: [email], total: 1, page: 1, limit: 20 }),
    );
    await svc.listEmails({ page: 1, limit: 20, status: "failed", recipient: "a@x" });
    expect((await svc.resendEmail("m-1")).status).toBe("queued");
    expect(calls.map((c) => [c.method, c.url.replace(API, "")])).toEqual([
      ["GET", "/admin/email-log?page=1&limit=20&status=failed&recipient=a%40x"],
      ["POST", "/admin/email-log/m-1/resend"],
    ]);
  });

  it("saves, previews and resets a template; reads the problems of a refused one", async () => {
    const svc = await load();
    stub((url, method) => {
      if (url.endsWith("/preview"))
        return json({ subject: "Booking confirmed: SM-2026-0042", html: "<p>x</p>", text: "x" });
      if (method === "PATCH")
        return json(
          {
            statusCode: 400,
            code: "INVALID_TEMPLATE",
            message: "x",
            details: { problems: ["{{ booking_reference }} is required"] },
          },
          400,
        );
      return json({ ...template, is_customised: method !== "DELETE" });
    });
    expect((await svc.previewTemplate("booking_confirmed", { subject: "Hi" })).subject).toMatch(
      /SM-2026-0042/,
    );
    const err = (await svc
      .saveTemplate("booking_confirmed", { body: "Hello" })
      .catch((e: unknown) => e)) as { body: unknown };
    expect(svc.templateProblems(err.body)).toEqual(["{{ booking_reference }} is required"]);
    expect((await svc.resetTemplate("booking_confirmed")).is_customised).toBe(false);
    expect(calls.map((c) => [c.method, c.url.replace(API, ""), c.body])).toEqual([
      ["POST", "/admin/notification-templates/booking_confirmed/preview", { subject: "Hi" }],
      ["PATCH", "/admin/notification-templates/booking_confirmed", { body: "Hello" }],
      ["DELETE", "/admin/notification-templates/booking_confirmed", undefined],
    ]);
  });
});

describe("notification wording", () => {
  it("links alerts and words times", () => {
    expect(alertHref("booking", "b-1")).toBe("/admin/bookings/b-1");
    expect(alertHref("enquiry", "e-1")).toBe("/admin/enquiries/e-1");
    expect(alertHref("cancellation_request", "c-1")).toBe(
      "/admin/bookings/cancellation-requests/c-1",
    );
    expect(alertHref("support_request", "s-1")).toBeNull();
    const now = Date.parse("2026-11-12T10:00:00Z");
    expect(timeAgo("2026-11-12T09:59:40Z", now)).toBe("Just now");
    expect(timeAgo("2026-11-12T09:55:00Z", now)).toBe("5 min ago");
    expect(timeAgo("2026-11-12T07:00:00Z", now)).toBe("3 h ago");
    expect(timeAgo("2026-11-11T08:00:00Z", now)).toBe("Yesterday");
  });
});
