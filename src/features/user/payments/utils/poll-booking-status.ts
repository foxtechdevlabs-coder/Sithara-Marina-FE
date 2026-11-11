import { paymentOutcome } from "@/features/user/booking/utils/booking-status";
import { isApiError } from "@/services/http/api-error";
import type { BookingStatusResponse } from "@/services/user/booking.service";

export const POLL_INTERVAL_MS = 2_000;
export const POLL_TIMEOUT_MS = 60_000;
/** After the window closed without a Razorpay result: a short check, not a long wait. */
export const DISMISS_CHECK_MS = 20_000;

export type PollResult =
  | { outcome: "confirmed" | "failed"; status: BookingStatusResponse }
  | { outcome: "timeout" | "cancelled" }
  | { outcome: "error"; error: unknown };

export interface PollOptions {
  read: (signal: AbortSignal) => Promise<BookingStatusResponse>;
  /** Stops polling, e.g. when the page unmounts. */
  signal?: AbortSignal;
  /** Longest wait; 60 seconds unless told otherwise. */
  timeoutMs?: number;
}

/**
 * A 4xx will not change by asking again (except 408 and 429). Everything else
 * (offline, timeouts, 5xx) says nothing about the booking, so it never counts
 * as a failed payment: polling carries on.
 */
function isPermanent(error: unknown): boolean {
  if (!isApiError(error) || error.status === undefined) return false;
  return error.status >= 400 && error.status < 500 && ![408, 429].includes(error.status);
}

/**
 * Reads the booking status at once, then every 2 seconds for at most 60 seconds.
 * A tick that finds the previous request still running is skipped, so requests
 * never overlap. Only the backend's answer can end in success; a failed payment or
 * a closed booking ends it too. Nothing else does before 60 seconds.
 */
export function pollBookingStatus({
  read,
  signal,
  timeoutMs = POLL_TIMEOUT_MS,
}: PollOptions): Promise<PollResult> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve({ outcome: "cancelled" });
      return;
    }

    const requests = new AbortController();
    const startedAt = Date.now();
    let inFlight = false;
    let finished = false;

    const finish = (result: PollResult) => {
      if (finished) return;
      finished = true;
      clearInterval(interval);
      clearTimeout(deadline);
      signal?.removeEventListener("abort", onAbort);
      requests.abort();
      resolve(result);
    };
    const onAbort = () => finish({ outcome: "cancelled" });

    const tick = async () => {
      if (inFlight || finished || Date.now() - startedAt >= timeoutMs) return;
      inFlight = true;
      try {
        const status = await read(requests.signal);
        const outcome = paymentOutcome(status);
        if (outcome === "confirmed") finish({ outcome: "confirmed", status });
        else if (outcome === "closed" || outcome === "payment_failed") {
          finish({ outcome: "failed", status });
        }
      } catch (error) {
        if (isPermanent(error)) finish({ outcome: "error", error });
      } finally {
        inFlight = false;
      }
    };

    signal?.addEventListener("abort", onAbort, { once: true });
    // finish() reads these; it cannot run before they are set (the first tick is below).
    const deadline = setTimeout(() => finish({ outcome: "timeout" }), timeoutMs);
    const interval = setInterval(() => void tick(), POLL_INTERVAL_MS);
    void tick();
  });
}
