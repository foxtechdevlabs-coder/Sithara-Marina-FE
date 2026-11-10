import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  paymentMethodText,
  paymentReference,
  paymentStatusLabel,
  refundStatusLabel,
} from "@/features/admin/refunds/utils/money-format";

// Admin payments and refunds against a stubbed `fetch`, following the backend
// contract for /admin/payments, /admin/refunds and POST /admin/bookings/{id}/refunds.
const API = "http://api.test";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const refund = {
  id: "r-1",
  booking: { id: "b-1", reference: "SM-1048", status: "cancelled", contact_name: "Ananya Menon" },
  payment_id: "pay-1",
  channel: "gateway",
  amount: 2_625_000,
  currency: "INR",
  status: "pending",
  reason: "Approved adjustment",
  approved_by: { id: "s-1", name: "Anjali Krishnan" },
  provider_refund_id: null,
  attempt: 1,
  reference: null,
  refunded_on: null,
  recorded_by: null,
  failure_code: null,
  failure_description: null,
  processed_at: null,
  failed_at: null,
  created_at: "2026-11-10T10:00:00.000Z",
};

type Call = { url: string; method: string; body: unknown; key: string | null };
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
        key: new Headers(init.headers).get("Idempotency-Key"),
      });
      return respond(url, method);
    }),
  );
}

async function load() {
  vi.resetModules();
  const session = await import("@/services/admin/admin-session");
  session.saveTokens({ access_token: "access-1", refresh_token: "refresh-1", expires_in: 900 });
  return import("@/services/admin/payments.service");
}

beforeEach(() => vi.stubEnv("NEXT_PUBLIC_API_URL", API));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("payments and refunds service", () => {
  it("lists payments needing review with a search", async () => {
    const svc = await load();
    stub(() => json({ items: [], total: 0, page: 1, limit: 20 }));
    await svc.listPayments({ page: 1, limit: 20, search: "SM-1048", needs_review: true });
    expect(calls[0]?.url).toBe(
      `${API}/admin/payments?page=1&limit=20&search=SM-1048&needs_review=true`,
    );
  });

  it("requests a refund with an idempotency key", async () => {
    const svc = await load();
    stub(() => json(refund, 201));
    const key = svc.newIdempotencyKey();
    expect(key).toMatch(/^refund-[\w.:-]{8,93}$/);
    const saved = await svc.createRefund(
      "b-1",
      { amount: 2_625_000, reason: "Approved adjustment", payment_id: "pay-1" },
      key,
    );
    expect(saved.status).toBe("pending");
    expect(calls[0]).toMatchObject({
      method: "POST",
      url: `${API}/admin/bookings/b-1/refunds`,
      body: { amount: 2_625_000, reason: "Approved adjustment", payment_id: "pay-1" },
      key,
    });
  });

  it("records an offline refund and retries a failed one", async () => {
    const svc = await load();
    stub(() => json({ ...refund, channel: "offline", status: "processed" }));
    await svc.recordRefundResult("r-1", {
      status: "processed",
      refunded_on: "2026-11-09",
      reference: "Cash receipt 0042",
    });
    await svc.retryRefund("r-1");
    expect(calls.map((c) => [c.method, c.url.replace(API, ""), c.body])).toEqual([
      [
        "PATCH",
        "/admin/refunds/r-1",
        { status: "processed", refunded_on: "2026-11-09", reference: "Cash receipt 0042" },
      ],
      ["POST", "/admin/refunds/r-1/retry", undefined],
    ]);
  });
});

describe("money wording", () => {
  it("names statuses, methods and references like the design", () => {
    expect(paymentStatusLabel("succeeded")).toBe("Captured");
    expect(refundStatusLabel("pending")).toBe("Processing");
    expect(paymentMethodText({ method: "gateway", instrument: "upi" })).toBe("Online · UPI");
    expect(paymentMethodText({ method: "bank_transfer", instrument: null })).toBe("Bank transfer");
    expect(
      paymentReference({ id: "abcdef12-0000", provider_payment_id: null, reference: null }),
    ).toBe("PAY-ABCDEF12");
  });
});
