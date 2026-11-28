import { isApiError } from "@/services/http/api-error";
import { getBackendErrorDetails } from "@/services/http/backend-error";

/*
 * How long Razorpay Checkout may stay open for a booking hold. The backend's
 * `hold_expires_at` (returned by POST /bookings/{id}/payments) is the only
 * source of truth: there is no fixed 10-minute timer in the frontend.
 */

export const HOLD_ENDED_MESSAGE = "Your time to pay has ended. Please choose the slot again.";
export const PAYMENT_NOT_COMPLETED_MESSAGE =
  "Payment not completed. You can try again before your hold ends.";

/** Taken off the hold for clock differences and network delays. */
export const HOLD_SAFETY_MARGIN_SECONDS = 20;
/** Checkout is not opened with less time than this (after the margin). */
export const MIN_CHECKOUT_SECONDS = 60;
/** When Checkout closes with less than this left on the actual hold, the hold is over. */
export const HOLD_ENDED_ON_DISMISS_MS = 30_000;

/**
 * The hold deadline in epoch milliseconds: the first of `values` that is a
 * valid date (ISO string, Date or epoch ms). `null` when none is.
 */
export function holdDeadline(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value !== "string" && typeof value !== "number" && !(value instanceof Date)) {
      continue;
    }
    const ms = new Date(value).getTime();
    if (Number.isFinite(ms)) return ms;
  }
  return null;
}

/** Whole seconds Checkout may stay open: the time left on the hold, minus the safety margin. */
export function checkoutTimeoutSeconds(deadlineMs: number, now = Date.now()): number {
  return Math.floor((deadlineMs - now) / 1000) - HOLD_SAFETY_MARGIN_SECONDS;
}

/**
 * Whether Checkout may open for this hold, and with which `timeout` (seconds).
 * No deadline means nothing is reserved any more, so it may not open.
 */
export function checkoutWindow(
  deadlineMs: number | null,
  now = Date.now(),
): { open: true; timeoutSeconds: number } | { open: false } {
  if (deadlineMs === null) return { open: false };
  const timeoutSeconds = checkoutTimeoutSeconds(deadlineMs, now);
  return timeoutSeconds < MIN_CHECKOUT_SECONDS ? { open: false } : { open: true, timeoutSeconds };
}

/** Checkout closed (by the customer or its timeout): has the actual hold effectively ended? */
export function holdEndedOnDismiss(deadlineMs: number | null, now = Date.now()): boolean {
  return deadlineMs === null || deadlineMs - now < HOLD_ENDED_ON_DISMISS_MS;
}

/** POST /bookings/{id}/payments answered 409 `HOLD_EXPIRED`. */
export function isHoldExpiredError(error: unknown): boolean {
  return (
    isApiError(error) &&
    error.status === 409 &&
    getBackendErrorDetails(error).code === "HOLD_EXPIRED"
  );
}
