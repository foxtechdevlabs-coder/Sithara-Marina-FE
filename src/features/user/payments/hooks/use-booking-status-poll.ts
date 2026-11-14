"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getBookingStatus } from "@/services/user/booking.service";

import { pollBookingStatus, type PollResult } from "../utils/poll-booking-status";

export type PollState = { outcome: "idle" | "polling" } | PollResult;

/** Runs one status poll at a time and stops it when the page unmounts. */
export function useBookingStatusPoll(bookingId: string, checkoutToken: string | null) {
  const [state, setState] = useState<PollState>({ outcome: "idle" });
  const running = useRef<AbortController | null>(null);

  const start = useCallback(async (timeoutMs?: number) => {
    if (running.current) return;
    const controller = new AbortController();
    running.current = controller;
    setState({ outcome: "polling" });
    const result = await pollBookingStatus({
      read: (signal) => getBookingStatus(bookingId, checkoutToken, signal),
      signal: controller.signal,
      timeoutMs,
    });
    if (running.current === controller) running.current = null;
    if (result.outcome !== "cancelled") setState(result);
  }, [bookingId, checkoutToken]);

  /** Forgets a finished poll's result, e.g. before a new payment attempt. */
  const reset = useCallback(() => {
    if (!running.current) setState({ outcome: "idle" });
  }, []);

  useEffect(
    () => () => {
      running.current?.abort();
      running.current = null;
    },
    [],
  );

  return { state, start, reset };
}
