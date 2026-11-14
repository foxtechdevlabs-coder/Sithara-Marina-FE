import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Admin bookings against a stubbed `fetch`. Paths, methods and bodies follow
// the backend OpenAPI contract for /admin/bookings/* and the helpers the
// office booking form uses.
const API = "http://api.test";
const ID = "b0000000-0000-4000-8000-000000000001";

function json(body: unknown, status = 200) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const summary = {
  id: ID,
  reference: "SM-2026-1048",
  status: "confirmed",
  source: "office",
  payment_status: "succeeded",
  needs_review: false,
  yacht: { id: "y-1", name: "Astra One", ownership: "own" },
  customer: { id: "c-1", full_name: "Ananya Menon", email: "ananya@example.com" },
  contact: { full_name: "Ananya Menon", email: "ananya@example.com", phone: "+919800000000" },
  date: "2026-11-12",
  start_time: "09:00",
  end_time: "13:00",
  time_zone: "Asia/Kolkata",
  starts_at: "2026-11-12T03:30:00.000Z",
  ends_at: "2026-11-12T07:30:00.000Z",
  guest_count: 8,
  currency: "INR",
  total_amount: 13_125_000,
  hold_expires_at: null,
  created_at: "2026-10-25T10:00:00.000Z",
};

const detail = {
  ...summary,
  slot_type_name: "4-hour",
  partner: null,
  special_requests: null,
  terms_accepted_at: null,
  slot_released_at: null,
  pricing: {
    currency: "INR",
    charter_amount: 10_000_000,
    addons: [],
    subtotal: 11_122_881,
    tax_rate: 18,
    tax_label: "GST",
    tax_amount: 2_002_119,
    total_amount: 13_125_000,
    price_rule: { id: "r-1" },
  },
  commission: { rate: null, amount: 0, partner_payable: 0 },
  payments: [
    {
      id: "p-1",
      provider: "office",
      status: "succeeded",
      amount: 13_125_000,
      currency: "INR",
      provider_order_id: null,
      provider_payment_id: null,
      captured_at: "2026-10-25T10:00:00.000Z",
      failure_code: null,
      failure_description: null,
      exception_reason: null,
      method: "bank_transfer",
      reference: "BANK-REF-1048",
      received_on: "2026-10-25",
      recorded_by_id: "s-1",
      created_at: "2026-10-25T10:00:00.000Z",
    },
  ],
  invoice: null,
  notes: [],
  cancellation: null,
  closed_at: null,
  price_override: null,
  updated_at: "2026-10-25T10:00:00.000Z",
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
  return import("@/services/admin/bookings.service");
}

const lastPath = () => new URL(calls.at(-1)!.url).pathname;
const lastQuery = () => Object.fromEntries(new URL(calls.at(-1)!.url).searchParams);

beforeEach(() => vi.stubEnv("NEXT_PUBLIC_API_URL", API));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("booking list and record", () => {
  it("lists with the documented filters and the admin token", async () => {
    const svc = await load();
    stub(() => json({ items: [summary], total: 1, page: 1, limit: 20 }));
    const list = await svc.listBookings({
      page: 1,
      limit: 20,
      search: "SM-2026",
      status: "confirmed",
      yacht_id: "y-1",
      from: "2026-11-01",
      to: "2026-11-30",
      needs_review: true,
      sort: "charter_date",
    });
    expect(list.items[0]!.reference).toBe("SM-2026-1048");
    expect(calls[0]).toMatchObject({ method: "GET", auth: "Bearer access-1" });
    expect(lastPath()).toBe("/admin/bookings");
    expect(lastQuery()).toEqual({
      page: "1",
      limit: "20",
      search: "SM-2026",
      status: "confirmed",
      yacht_id: "y-1",
      from: "2026-11-01",
      to: "2026-11-30",
      needs_review: "true",
      sort: "charter_date",
    });
  });

  it("reads a booking, and a new status value doesn't break it", async () => {
    const svc = await load();
    stub(() => json({ ...detail, status: "on_hold" }));
    const booking = await svc.getBooking(ID);
    expect(booking.status).toBe("on_hold");
    expect(booking.payments[0]!.method).toBe("bank_transfer");
    expect(lastPath()).toBe(`/admin/bookings/${ID}`);
  });

  it("reads the timeline with paging", async () => {
    const svc = await load();
    stub(() =>
      json({
        items: [
          {
            at: "2026-10-25T10:00:00.000Z",
            type: "booking_created",
            actor: null,
            summary: "Booking created",
            details: null,
          },
        ],
        total: 1,
        page: 1,
        limit: 100,
      }),
    );
    const timeline = await svc.getBookingTimeline(ID, { limit: 100 });
    expect(timeline.items[0]!.summary).toBe("Booking created");
    expect(lastPath()).toBe(`/admin/bookings/${ID}/timeline`);
    expect(lastQuery()).toEqual({ limit: "100" });
  });
});

describe("booking changes", () => {
  it("sends each change to its endpoint with the documented body", async () => {
    const svc = await load();
    stub((url) =>
      url.endsWith("/notes")
        ? json(
            {
              id: "n-1",
              body: "Cake on board",
              author: { id: "s-1", name: "Anjali" },
              created_at: "2026-10-26T10:00:00.000Z",
            },
            201,
          )
        : url.endsWith("/payment-link")
          ? json(
              {
                url: "https://site/pay#token=x",
                expires_at: "2026-10-27T10:00:00.000Z",
                emailed: true,
              },
              201,
            )
          : json(detail),
    );

    await svc.updateBooking(ID, { contact_phone: null, guest_count: 6 });
    expect(calls.at(-1)).toMatchObject({
      method: "PATCH",
      body: { contact_phone: null, guest_count: 6 },
    });

    await svc.addBookingNote(ID, "Cake on board");
    expect(calls.at(-1)).toMatchObject({ method: "POST", body: { body: "Cake on board" } });
    expect(lastPath()).toBe(`/admin/bookings/${ID}/notes`);

    const link = await svc.issuePaymentLink(ID);
    expect(link.emailed).toBe(true);
    expect(calls.at(-1)).toMatchObject({ method: "POST", body: undefined });

    await svc.recordOfficePayment(ID, {
      method: "bank_transfer",
      amount: 13_125_000,
      reference: "BANK-REF-1048",
      received_on: "2026-10-25",
    });
    expect(lastPath()).toBe(`/admin/bookings/${ID}/payments`);
    expect(calls.at(-1)!.body).toEqual({
      method: "bank_transfer",
      amount: 13_125_000,
      reference: "BANK-REF-1048",
      received_on: "2026-10-25",
    });

    await svc.cancelBooking(ID, {
      reason: "Travel plans changed",
      refund_decision: "partial",
      refund_amount: 50_000,
    });
    expect(lastPath()).toBe(`/admin/bookings/${ID}/cancel`);
    expect(calls.at(-1)!.body).toEqual({
      reason: "Travel plans changed",
      refund_decision: "partial",
      refund_amount: 50_000,
    });

    await svc.rescheduleBooking(ID, {
      slot_type_id: "s-1",
      date: "2026-11-13",
      start_time: "09:00",
    });
    expect(lastPath()).toBe(`/admin/bookings/${ID}/reschedule`);

    await svc.overrideBookingPrice(ID, { charter_amount: 9_000_000, reason: "Repeat customer" });
    expect(lastPath()).toBe(`/admin/bookings/${ID}/price-override`);
    expect(calls.at(-1)!.body).toEqual({ charter_amount: 9_000_000, reason: "Repeat customer" });

    await svc.changeBookingStatus(ID, "no_show");
    expect(lastPath()).toBe(`/admin/bookings/${ID}/status`);
    expect(calls.at(-1)!.body).toEqual({ status: "no_show" });
  });

  it("creates an office booking with an offline payment", async () => {
    const svc = await load();
    stub(() => json(detail, 201));
    await svc.createOfficeBooking({
      yacht_id: "y-1",
      slot_type_id: "s-1",
      date: "2026-11-12",
      start_time: "09:00",
      guests: 8,
      customer: { full_name: "Ananya Menon", email: "ananya@example.com", phone: "+919800000000" },
      expected_total_amount: 13_125_000,
      payment: { method: "cash", received_on: "2026-11-10" },
    });
    expect(calls[0]).toMatchObject({ method: "POST" });
    expect(lastPath()).toBe("/admin/bookings");
    expect(calls[0]!.body).toMatchObject({
      expected_total_amount: 13_125_000,
      payment: { method: "cash" },
    });
  });

  it("keeps the backend code on a refused change", async () => {
    const svc = await load();
    stub(() =>
      json({ statusCode: 409, code: "PRICE_WOULD_CHANGE", message: "Price would change" }, 409),
    );
    const error = await svc
      .rescheduleBooking(ID, { date: "2026-11-13", start_time: "09:00" })
      .catch((e) => e);
    expect(error.code).toBe("PRICE_WOULD_CHANGE");
    const { bookingErrorMessage } = await import("@/features/admin/bookings/utils/booking-format");
    expect(bookingErrorMessage(error)).toMatch(/would change the price/);
  });
});

describe("office booking helpers", () => {
  it("searches active customers, add-ons and free slots with the right queries", async () => {
    const svc = await load();
    stub((url) => {
      if (url.includes("/admin/customers"))
        return json({
          items: [
            {
              id: "c-1",
              full_name: "Ananya Menon",
              email: "a@x.com",
              phone: null,
              is_active: true,
            },
          ],
          total: 1,
          page: 1,
          limit: 8,
        });
      if (url.includes("/admin/addons"))
        return json({
          items: [
            {
              id: "a-1",
              yacht_id: null,
              name: "Seasonal menu",
              description: null,
              price: 150_000,
              min_quantity: 1,
              max_quantity: 12,
              is_active: true,
              created_at: "x",
              updated_at: "x",
            },
          ],
          total: 1,
          page: 1,
          limit: 100,
        });
      return json({
        from: "2026-11-12",
        to: "2026-11-12",
        timezone: "Asia/Kolkata",
        yachts: [
          {
            id: "y-1",
            bookings: [],
            holds: [],
            blocks: [],
            free_windows: [
              {
                date: "2026-11-12",
                slot_type_id: "s-1",
                slot_type_name: "4-hour",
                start_time: "09:00",
                end_time: "13:00",
                starts_at: "x",
                ends_at: "x",
                price: 10_000_000,
              },
            ],
          },
          { id: "y-2", bookings: [], holds: [], blocks: [], free_windows: [] },
        ],
      });
    });

    expect((await svc.searchCustomers("anan"))[0]!.full_name).toBe("Ananya Menon");
    expect(lastQuery()).toEqual({ search: "anan", status: "active", limit: "8", sort: "name" });

    expect((await svc.listYachtAddons("y-1"))[0]!.name).toBe("Seasonal menu");
    expect(lastQuery()).toEqual({ yacht_id: "y-1", status: "active", limit: "100" });

    const calendar = await svc.getYachtCalendar("y-1", "2026-11-12", "2026-11-12");
    expect(calendar?.free_windows).toHaveLength(1);
    expect(lastPath()).toBe("/admin/calendar");
    expect(lastQuery()).toEqual({
      yacht_id: "y-1",
      from: "2026-11-12",
      to: "2026-11-12",
      include_inactive: "true",
    });
  });

  it("downloads the bookings CSV with the token, and reports a refused export", async () => {
    const svc = await load();
    stub(
      () =>
        new Response("reference,status\nSM-1,confirmed\n", {
          status: 200,
          headers: { "Content-Type": "text/csv" },
        }),
    );
    const blob = await svc.downloadBookingsCsv({
      from: "2026-11-01",
      to: "2026-11-30",
      status: "confirmed",
    });
    expect(await blob.text()).toContain("SM-1");
    expect(lastPath()).toBe("/admin/reports/bookings/export");
    expect(lastQuery()).toEqual({
      from: "2026-11-01",
      to: "2026-11-30",
      status: "confirmed",
      format: "csv",
    });
    expect(calls[0]!.auth).toBe("Bearer access-1");

    stub(() => json({ statusCode: 400, code: "REPORT_TOO_LARGE", message: "Too large" }, 400));
    const error = await svc
      .downloadBookingsCsv({ from: "2026-01-01", to: "2026-12-31" })
      .catch((e) => e);
    expect(error.code).toBe("REPORT_TOO_LARGE");
  });
});
