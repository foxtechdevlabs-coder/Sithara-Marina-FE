/** Times are "HH:mm" (24-hour) in code and in the API, and 12-hour on screen. */

const pad = (n: number) => String(n).padStart(2, "0");

export type Period = "AM" | "PM";

export interface TimeParts {
  /** 1 to 12. */
  hour: number;
  minute: number;
  period: Period;
}

/** "17:30" → { hour: 5, minute: 30, period: "PM" } */
export function toParts(time: string): TimeParts {
  const hours = Number(time.slice(0, 2));
  return {
    hour: hours % 12 || 12,
    minute: Number(time.slice(3, 5)),
    period: hours < 12 ? "AM" : "PM",
  };
}

/** { hour: 5, minute: 30, period: "PM" } → "17:30" */
export function fromParts({ hour, minute, period }: TimeParts): string {
  return `${pad((hour % 12) + (period === "PM" ? 12 : 0))}:${pad(minute)}`;
}

/** "17:30" → "5:30 PM". Anything that isn't a time comes back unchanged. */
export function formatTime(time: string): string {
  if (!/^\d{2}:\d{2}$/.test(time)) return time;
  const { hour, minute, period } = toParts(time);
  return `${hour}:${pad(minute)} ${period}`;
}

/**
 * Reads "5:30 PM", "5 PM" or "17:30" as "HH:mm". Anything else comes back
 * unchanged, so callers can report it.
 */
export function parseTime(text: string): string {
  const value = text.trim();
  const match = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i.exec(value);
  if (!match) return value;
  const [, hourText, minuteText, period] = match;
  const hours = Number(hourText);
  const minutes = Number(minuteText ?? "0");
  if (minutes > 59) return value;
  if (period) {
    if (hours < 1 || hours > 12) return value;
    return fromParts({
      hour: hours,
      minute: minutes,
      period: period.toUpperCase() as Period,
    });
  }
  if (minuteText === undefined || hours > 23) return value;
  return `${pad(hours)}:${pad(minutes)}`;
}

/** Limits an "HH:mm" time to a window; either end can be left open. */
export function clampTime(time: string, min?: string, max?: string): string {
  if (min && time < min) return min;
  if (max && time > max) return max;
  return time;
}
