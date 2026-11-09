import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  bookingOutcome,
  type BookingOutcome,
} from "@/features/user/booking/utils/booking-status";
import {
  pollBookingStatus,
  POLL_INTERVAL_MS,
  POLL_TIMEOUT_MS,
} from "@/features/user/payments/utils/poll-booking-status";
import { ApiError } from "@/services/http/api-error";
import type { BookingStatus, BookingStatusResponse } from "@/services/user/booking.service";

const answer = (
  status: BookingStatus,
  payment_status: BookingStatusResponse["payment_status"] = "pending",
): BookingStatusResponse => ({
  id: "b-1",
  reference: "SM-2026-0001",
  status,
  hold_expires_at: null,
  payment_status,
});

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("bookingOutcome", () => {
  it.each<[BookingStatus, BookingOutcome]>([
    ["pending_payment", "pending"],
    ["confirmed", "confirmed"],
    ["completed", "confirmed"],
    ["cancelled", "closed"],
    ["refunded", "closed"],
    ["no_show", "closed"],
  ])("maps %s to %s", (status, outcome) => {
    expect(bookingOutcome(status)).toBe(outcome);
  });
});

describe("pollBookingStatus", () => {
  it("uses the required timing", () => {
    expect(POLL_INTERVAL_MS).toBe(2_000);
    expect(POLL_TIMEOUT_MS).toBe(60_000);
  });

  it("asks at once, then every 2 seconds", async () => {
    const read = vi.fn(async () => answer("pending_payment"));
    void pollBookingStatus({ read });

    expect(read).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1_999);
    expect(read).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(read).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(read).toHaveBeenCalledTimes(3);
  });

  it("stops at once on success", async () => {
    const read = vi
      .fn<() => Promise<BookingStatusResponse>>()
      .mockResolvedValueOnce(answer("pending_payment"))
      .mockResolvedValueOnce(answer("confirmed"));
    const result = pollBookingStatus({ read });

    await vi.advanceTimersByTimeAsync(2_000);

    await expect(result).resolves.toMatchObject({ outcome: "confirmed" });
    await vi.advanceTimersByTimeAsync(10_000);
    expect(read).toHaveBeenCalledTimes(2);
  });

  it.each(["failed", "cancelled"] as const)(
    "stops when the payment is %s, while the booking waits",
    async (payment) => {
      const result = pollBookingStatus({ read: async () => answer("pending_payment", payment) });
      await vi.advanceTimersByTimeAsync(0);
      await expect(result).resolves.toMatchObject({ outcome: "failed" });
    },
  );

  it("keeps polling while the payment is processing or just succeeded", async () => {
    const read = vi
      .fn<() => Promise<BookingStatusResponse>>()
      .mockResolvedValueOnce(answer("pending_payment", "processing"))
      .mockResolvedValueOnce(answer("pending_payment", "succeeded"))
      .mockResolvedValueOnce(answer("confirmed", "succeeded"));
    const result = pollBookingStatus({ read });
    await vi.advanceTimersByTimeAsync(4_000);
    await expect(result).resolves.toMatchObject({ outcome: "confirmed" });
    expect(read).toHaveBeenCalledTimes(3);
  });

  it("stops on a status that can no longer be paid", async () => {
    const result = pollBookingStatus({ read: async () => answer("cancelled") });
    await vi.advanceTimersByTimeAsync(0);
    await expect(result).resolves.toMatchObject({ outcome: "failed" });
  });

  it("times out at exactly 60 seconds and asks nothing more", async () => {
    const read = vi.fn(async () => answer("pending_payment"));
    let settled = false;
    const result = pollBookingStatus({ read }).then((value) => {
      settled = true;
      return value;
    });

    await vi.advanceTimersByTimeAsync(59_999);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);

    await expect(result).resolves.toEqual({ outcome: "timeout" });
    expect(read).toHaveBeenCalledTimes(30); // 0, 2, … 58 s
    await vi.advanceTimersByTimeAsync(10_000);
    expect(read).toHaveBeenCalledTimes(30);
  });

  it("never overlaps requests", async () => {
    let finishFirst: (value: BookingStatusResponse) => void = () => {};
    const read = vi
      .fn<() => Promise<BookingStatusResponse>>()
      .mockImplementationOnce(() => new Promise((resolve) => (finishFirst = resolve)))
      .mockResolvedValue(answer("pending_payment"));
    void pollBookingStatus({ read });

    await vi.advanceTimersByTimeAsync(7_000); // three ticks pass during the slow request
    expect(read).toHaveBeenCalledTimes(1);

    finishFirst(answer("pending_payment"));
    await vi.advanceTimersByTimeAsync(1_000);
    expect(read).toHaveBeenCalledTimes(2);
  });

  it.each([
    ["offline", new ApiError("x", { kind: "network" })],
    ["a slow answer", new ApiError("x", { kind: "timeout" })],
    ["a server error", new ApiError("x", { kind: "http", status: 503 })],
    ["rate limiting", new ApiError("x", { kind: "http", status: 429 })],
  ])("keeps polling through %s, without calling it a failed payment", async (_, error) => {
    const read = vi
      .fn<() => Promise<BookingStatusResponse>>()
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce(answer("confirmed"));
    const result = pollBookingStatus({ read });

    await vi.advanceTimersByTimeAsync(2_000);

    await expect(result).resolves.toMatchObject({ outcome: "confirmed" });
  });

  it("stops on an answer that will not change", async () => {
    const error = new ApiError("x", { kind: "http", status: 404 });
    const result = pollBookingStatus({
      read: async () => {
        throw error;
      },
    });
    await vi.advanceTimersByTimeAsync(0);
    await expect(result).resolves.toEqual({ outcome: "error", error });
  });

  it("stops when the page unmounts, cancelling the running request", async () => {
    const seen: AbortSignal[] = [];
    const read = vi.fn((signal: AbortSignal) => {
      seen.push(signal);
      return new Promise<BookingStatusResponse>(() => {});
    });
    const controller = new AbortController();
    const result = pollBookingStatus({ read, signal: controller.signal });

    controller.abort();

    await expect(result).resolves.toEqual({ outcome: "cancelled" });
    expect(seen[0]?.aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(read).toHaveBeenCalledTimes(1);
  });
});
