import { bookingOutcome } from "@/features/user/booking/utils/booking-status";
import { isApiError } from "@/services/http/api-error";
import type { BookingStatusResponse } from "@/services/user/booking.service";

export const POLL_INTERVAL_MS = 2_000;
export const POLL_TIMEOUT_MS = 60_000;

export type PollResult =
  | { outcome: "confirmed" | "failed"; status: BookingStatusResponse }
  | { outcome: "timeout" | "cancelled" }
  | { outcome: "error"; error: unknown };

export interface PollOptions {
  read: (signal: AbortSignal) => Promise<BookingStatusResponse>;
  /** Stops polling, e.g. when the page unmounts. */
  signal?: AbortSignal;
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
 * never overlap. Only the backend's answer can end in success.
 */
export function pollBookingStatus({ read, signal }: PollOptions): Promise<PollResult> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve({ outcome: "cancelled" });
      return;
    }

    const requests = new AbortController();
    const startedAt = Date.now();
    let inFlight = false;
    let finished = false;
    let interval: ReturnType<typeof setInterval> | undefined;
    let deadline: ReturnType<typeof setTimeout> | undefined;

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
      if (inFlight || finished || Date.now() - startedAt >= POLL_TIMEOUT_MS) return;
      inFlight = true;
      try {
        const status = await read(requests.signal);
        const outcome = bookingOutcome(status.status);
        if (outcome === "confirmed") finish({ outcome: "confirmed", status });
        else if (outcome === "closed") finish({ outcome: "failed", status });
      } catch (error) {
        if (isPermanent(error)) finish({ outcome: "error", error });
      } finally {
        inFlight = false;
      }
    };

    signal?.addEventListener("abort", onAbort, { once: true });
    deadline = setTimeout(() => finish({ outcome: "timeout" }), POLL_TIMEOUT_MS);
    interval = setInterval(() => void tick(), POLL_INTERVAL_MS);
    void tick();
  });
}
