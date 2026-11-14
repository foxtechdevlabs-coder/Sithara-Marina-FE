import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  linkState,
  paymentLinkErrorMessage,
} from "@/features/user/payment-link/utils/payment-link";
import { ApiError } from "@/services/http/api-error";

// Payment-link services against a stubbed `fetch`. Shapes follow the backend Swagger schemas.
const API = "http://api.test";
const TOKEN = "link-id.link-secret";

interface Call {
  url: string;
  method: string | undefined;
  headers: Headers;
  body: unknown;
}

const stub = (respond: (url: string) => [unknown, number]) => {
  const calls: Call[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    calls.push({
      url,
      method: init.method,
      headers: new Headers(init.headers),
      body: init.body ? JSON.parse(init.body as string) : undefined,
    });
    const [body, status] = respond(url);
    return new Response(JSON.stringify(body), { status });
  });
  return calls;
};

const load = () => import("@/services/user/payment-link.service");

const SUMMARY = {
  booking_id: "b-1",
  reference: "SM-2026-0042",
  status: "pending_payment",
  payment_status: "not_started",
  payable: true,
  amount_due: 2_360_000,
  yacht_name: "Azure Pearl",
  slot_type_name: "Half day",
  date: "2026-12-16",
  start_time: "09:00",
  end_time: "13:00",
  time_zone: "Asia/Kolkata",
  guest_count: 6,
  contact_name: "Anu Varghese",
  pricing: {
    currency: "INR",
    charter_amount: 2_000_000,
    addons: [],
    subtotal: 2_000_000,
    tax_rate: 18,
    tax_label: "GST",
    tax_amount: 360_000,
    total_amount: 2_360_000,
  },
  pay_by: "2026-12-15T09:00:00.000Z",
};

const CHECKOUT = {
  payment_id: "p-1",
  booking_id: "b-1",
  provider: "razorpay",
  status: "pending",
  amount: 2_360_000,
  currency: "INR",
  hold_expires_at: "2026-12-15T09:00:00.000Z",
  checkout: { key_id: "rzp_test_x", order_id: "order_x" },
};

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_API_URL", API);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("payment link service", () => {
  it("sends the link token, and no account token, on all three calls", async () => {
    const svc = await load();
    const calls = stub((url) =>
      url.endsWith("/pay")
        ? [SUMMARY, 200]
        : url.endsWith("/payments")
          ? [CHECKOUT, 201]
          : [
              {
                booking_id: "b-1",
                booking_status: "confirmed",
                payment_status: "succeeded",
                outcome: "confirmed",
              },
              200,
            ],
    );
    const summary = await svc.getPaymentLink(TOKEN);
    const order = await svc.startLinkPayment(summary.booking_id, TOKEN);
    const payload = {
      razorpay_order_id: "order_x",
      razorpay_payment_id: "pay_x",
      razorpay_signature: "hex",
    };
    const verified = await svc.verifyLinkPayment("b-1", TOKEN, payload);

    expect(summary.amount_due).toBe(2_360_000);
    expect(order.checkout).toEqual({ key_id: "rzp_test_x", order_id: "order_x" });
    expect(verified.outcome).toBe("confirmed");
    expect(calls.map((c) => [c.method, c.url.replace(API, ""), c.body])).toEqual([
      ["GET", "/pay", undefined],
      ["POST", "/bookings/b-1/payments", undefined],
      ["POST", "/bookings/b-1/verify-payment", { payload }],
    ]);
    for (const c of calls) {
      expect(c.headers.get("X-Payment-Link-Token")).toBe(TOKEN);
      expect(c.headers.get("Authorization")).toBeNull();
    }
  });

  it("rejects a summary that breaks the contract", async () => {
    const svc = await load();
    stub(() => [{ ...SUMMARY, payable: "yes" }, 200]);
    await expect(svc.getPaymentLink(TOKEN)).rejects.toMatchObject({ kind: "validation" });
  });
});

describe("payment link state", () => {
  it("shows hours while there's plenty of time", async () => {
    const { formatTimeLeft } = await import("@/features/user/payment-link/utils/payment-link");
    expect(formatTimeLeft(5 * 3600 - 10)).toBe("4 h 59 min");
    expect(formatTimeLeft(729)).toBe("12:09");
  });

  it("reads the booking's state from the backend's fields", () => {
    expect(linkState(SUMMARY)).toEqual({ kind: "payable" });
    expect(linkState({ ...SUMMARY, payable: false, amount_due: 0, status: "confirmed" })).toEqual({
      kind: "paid",
    });
    expect(linkState({ ...SUMMARY, payable: false, payment_status: "succeeded" })).toEqual({
      kind: "paid",
    });
    expect(linkState({ ...SUMMARY, payable: false, payment_status: "processing" })).toEqual({
      kind: "processing",
    });
    // Still "payable" while a payment is processing: wait, don't offer to pay again.
    expect(linkState({ ...SUMMARY, payment_status: "processing" })).toEqual({ kind: "processing" });
    expect(linkState({ ...SUMMARY, payable: false, status: "cancelled" })).toEqual({
      kind: "closed",
      label: "cancelled",
    });
    expect(linkState({ ...SUMMARY, payable: false })).toEqual({ kind: "expired" });
  });

  it("words backend errors for the customer", () => {
    const err = (status: number, code: string) =>
      new ApiError("x", {
        kind: "http",
        status,
        body: { statusCode: status, code, message: "raw server text" },
      });
    expect(paymentLinkErrorMessage(err(404, "PAYMENT_LINK_NOT_FOUND"), "f")).toMatch(/isn’t valid/);
    expect(paymentLinkErrorMessage(err(409, "HOLD_EXPIRED"), "f")).toMatch(/time to pay/);
    expect(paymentLinkErrorMessage(err(503, "PAYMENT_PROVIDER_UNAVAILABLE"), "f")).toMatch(
      /didn’t answer/,
    );
    expect(paymentLinkErrorMessage(err(500, "SOMETHING_ELSE"), "fallback")).toBe("fallback");
  });
});
