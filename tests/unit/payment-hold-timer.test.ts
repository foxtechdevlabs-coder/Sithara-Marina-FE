import { afterEach, describe, expect, it, vi } from "vitest";

import {
  checkoutTimeoutSeconds,
  checkoutWindow,
  holdDeadline,
  holdEndedOnDismiss,
  isHoldExpiredError,
} from "@/features/user/payments/utils/hold-timer";
import { openRazorpay } from "@/features/user/payments/utils/razorpay";
import { ApiError } from "@/services/http/api-error";
import type { PaymentCheckout } from "@/services/user/booking.service";

// How long Razorpay Checkout may stay open for a booking hold, worked out from
// the backend's `hold_expires_at` (POST /bookings/{id}/payments).

const NOW = Date.parse("2026-11-26T10:10:00.000Z");
/** A deadline `seconds` after NOW. */
const inSeconds = (seconds: number) => NOW + seconds * 1000;

const httpError = (status: number, body: unknown) =>
  new ApiError(`Request failed (${status})`, { kind: "http", status, body });

describe("checkout timeout", () => {
  it("is the time left on the hold minus a 20-second margin, in whole seconds", () => {
    expect(checkoutTimeoutSeconds(inSeconds(600), NOW)).toBe(580);
    expect(checkoutTimeoutSeconds(inSeconds(600.9), NOW)).toBe(580);
    expect(checkoutTimeoutSeconds(inSeconds(99.5), NOW)).toBe(79);
  });

  it("opens Checkout only with at least 60 seconds after the margin", () => {
    expect(checkoutWindow(inSeconds(600), NOW)).toEqual({ open: true, timeoutSeconds: 580 });
    expect(checkoutWindow(inSeconds(80), NOW)).toEqual({ open: true, timeoutSeconds: 60 });
    expect(checkoutWindow(inSeconds(79.9), NOW)).toEqual({ open: false }); // 59 s
    expect(checkoutWindow(inSeconds(10), NOW)).toEqual({ open: false });
    expect(checkoutWindow(inSeconds(-5), NOW)).toEqual({ open: false }); // already over
  });

  it("does not open Checkout when nothing is reserved any more", () => {
    expect(checkoutWindow(null, NOW)).toEqual({ open: false });
  });

  it("is recalculated from each attempt's own deadline, never reused", () => {
    const deadline = inSeconds(500);
    const first = checkoutWindow(deadline, NOW);
    const retry = checkoutWindow(deadline, NOW + 200_000); // Pay now, 200 s later
    expect(first).toEqual({ open: true, timeoutSeconds: 480 });
    expect(retry).toEqual({ open: true, timeoutSeconds: 280 });
  });
});

describe("hold deadline", () => {
  it("reads the backend's ISO date-time", () => {
    expect(holdDeadline("2026-11-26T10:20:00.000Z")).toBe(Date.parse("2026-11-26T10:20:00.000Z"));
  });

  it("falls back to the next value when the first is missing or not a date", () => {
    const booking = "2026-11-26T10:20:00.000Z";
    expect(holdDeadline(undefined, booking)).toBe(Date.parse(booking));
    expect(holdDeadline({}, booking)).toBe(Date.parse(booking));
    expect(holdDeadline("not a date", booking)).toBe(Date.parse(booking));
    expect(holdDeadline(null, null)).toBeNull();
  });
});

describe("when Checkout closes", () => {
  it("treats the hold as ended with less than 30 seconds left", () => {
    expect(holdEndedOnDismiss(inSeconds(29), NOW)).toBe(true);
    expect(holdEndedOnDismiss(inSeconds(-1), NOW)).toBe(true); // closed by its timeout, late
    expect(holdEndedOnDismiss(null, NOW)).toBe(true);
  });

  it("lets the customer try again while the hold still has time", () => {
    expect(holdEndedOnDismiss(inSeconds(30), NOW)).toBe(false);
    expect(holdEndedOnDismiss(inSeconds(400), NOW)).toBe(false);
  });
});

describe("HOLD_EXPIRED from the payment endpoint", () => {
  it("is recognised from a 409 with code HOLD_EXPIRED", () => {
    expect(
      isHoldExpiredError(httpError(409, { statusCode: 409, code: "HOLD_EXPIRED", message: "x" })),
    ).toBe(true);
  });

  it("is not confused with other failures", () => {
    expect(isHoldExpiredError(httpError(409, { code: "PAYMENT_NOT_ALLOWED" }))).toBe(false);
    expect(isHoldExpiredError(httpError(400, { code: "HOLD_EXPIRED" }))).toBe(false);
    expect(isHoldExpiredError(new ApiError("offline", { kind: "network" }))).toBe(false);
    expect(isHoldExpiredError(new Error("HOLD_EXPIRED"))).toBe(false);
  });
});

describe("openRazorpay", () => {
  type Options = Record<string, unknown> & {
    handler: (response: Record<string, string>) => void;
    modal: { ondismiss: () => void };
  };

  /** A stand-in for Razorpay Checkout that records how it was opened. */
  function stubRazorpay() {
    const opened: Options[] = [];
    class FakeRazorpay {
      constructor(readonly options: Options) {
        opened.push(options);
      }
      on() {}
      open() {}
    }
    vi.stubGlobal("window", { Razorpay: FakeRazorpay });
    return opened;
  }

  const payment: PaymentCheckout = {
    payment_id: "pay_1",
    booking_id: "b1",
    provider: "razorpay",
    status: "pending",
    amount: 118000,
    currency: "INR",
    hold_expires_at: "2026-11-26T10:20:00.000Z",
    checkout: { key_id: "rzp_test_key", order_id: "order_1" },
  };

  const open = (overrides: Partial<Parameters<typeof openRazorpay>[0]> = {}) =>
    openRazorpay({
      payment,
      timeoutSeconds: 580,
      description: "Booking SM-1",
      prefill: { name: "Asha", email: "asha@example.com", contact: null },
      onSuccess: () => undefined,
      onFailure: () => undefined,
      onDismiss: () => undefined,
      ...overrides,
    });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("passes the key, the order and the timeout in seconds", async () => {
    const opened = stubRazorpay();
    await open();
    expect(opened[0]).toMatchObject({ key: "rzp_test_key", order_id: "order_1", timeout: 580 });
  });

  it("keeps the success handler, which hands the result on for verification", async () => {
    const opened = stubRazorpay();
    const onSuccess = vi.fn();
    const onDismiss = vi.fn();
    await open({ onSuccess, onDismiss });

    const result = { razorpay_order_id: "order_1", razorpay_payment_id: "pay_x", razorpay_signature: "sig" };
    opened[0]!.handler(result);
    opened[0]!.modal.ondismiss(); // Razorpay may close the modal after a success

    expect(onSuccess).toHaveBeenCalledWith(result);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("reports a close without payment (by the customer or the timeout)", async () => {
    const opened = stubRazorpay();
    const onDismiss = vi.fn();
    await open({ onDismiss });
    opened[0]!.modal.ondismiss();
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("opens a retry with its newly calculated timeout", async () => {
    const opened = stubRazorpay();
    await open({ timeoutSeconds: 580 });
    await open({ timeoutSeconds: 280 });
    expect(opened.map((options) => options.timeout)).toEqual([580, 280]);
  });
});
