/** "45 seconds", "1 minute", "about 59 minutes" — for rate-limit messages. */
export function formatWait(seconds: number): string {
  const s = Math.max(1, Math.ceil(seconds));
  if (s < 60) return `${s} second${s === 1 ? "" : "s"}`;
  const minutes = Math.ceil(s / 60);
  const label = `${minutes} minute${minutes === 1 ? "" : "s"}`;
  return s % 60 === 0 ? label : `about ${label}`;
}

/** "00:42" for the resend countdown. */
export function formatCountdown(seconds: number): string {
  const s = Math.max(0, seconds);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
