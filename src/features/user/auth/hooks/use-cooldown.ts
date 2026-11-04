"use client";

import { useEffect, useState } from "react";

/** Whole seconds until `availableAt` (epoch ms), ticking once per second; 0 when passed. */
export function useCooldown(availableAt: number): number {
  const [now, setNow] = useState(() => Date.now());
  const secondsLeft = Math.max(0, Math.ceil((availableAt - now) / 1000));

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = window.setTimeout(tick, 0); // resync as soon as the target changes
    const timer = window.setInterval(() => {
      tick();
      if (Date.now() >= availableAt) window.clearInterval(timer);
    }, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [availableAt]);

  return secondsLeft;
}
