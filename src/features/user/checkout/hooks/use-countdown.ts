"use client";

import { useEffect, useState } from "react";

/**
 * Seconds left until `deadlineMs`, ticking once a second. Display only: the
 * backend decides when a hold ends. `null` while there is no deadline.
 */
export function useCountdown(deadlineMs: number | null): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (deadlineMs === null) return;
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [deadlineMs]);

  if (deadlineMs === null || now === null) return null;
  return Math.max(0, Math.ceil((deadlineMs - now) / 1000));
}

/** 125 → "2:05". */
export function formatCountdown(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
