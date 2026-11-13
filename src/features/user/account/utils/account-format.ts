import { formatMinorUnits } from "@/features/user/yachts/utils/yacht-view";

/** Display formats of the account pages, as in the Figma ("12 November 2026", "09:00–13:00"). */

const fullDate = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const dayMonth = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/** "YYYY-MM-DD" as a calendar date (read in UTC so it never shifts a day). */
function parseDay(date: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const value = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(value.getTime()) ? null : value;
}

/** "2026-11-12" → "12 November 2026". Anything else comes back unchanged. */
export function formatLongDate(date: string): string {
  const value = parseDay(date);
  return value ? fullDate.format(value) : date;
}

/** "2026-11-12" → "12 November". */
export function formatDayMonth(date: string): string {
  const value = parseDay(date);
  return value ? dayMonth.format(value) : date;
}

/** "09:00", "13:00" → "09:00–13:00". */
export const formatTimeRange = (start: string, end: string) => `${start}–${end}`;

/** Paise → "₹ 1,31,250". */
export const formatAmount = (amount: number, currency: string) =>
  formatMinorUnits(amount, currency) ?? "";

export const guests = (count: number) => `${count} guest${count === 1 ? "" : "s"}`;

/** Today in Kerala as "YYYY-MM-DD", for comparing with booking dates. */
export function todayInKerala(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
}

/** 240 → "4 hours", 90 → "1 hour 30 min". */
export function formatHours(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hourText = hours ? `${hours} hour${hours === 1 ? "" : "s"}` : "";
  return [hourText, rest ? `${rest} min` : ""].filter(Boolean).join(" ") || "0 min";
}

/** "09:00", "13:00" → 240; 0 when either time is unreadable. */
export function minutesBetween(start: string, end: string): number {
  const toMinutes = (time: string) => {
    const match = /^(\d{1,2}):(\d{2})/.exec(time);
    return match ? Number(match[1]) * 60 + Number(match[2]) : NaN;
  };
  const diff = toMinutes(end) - toMinutes(start);
  return Number.isFinite(diff) && diff > 0 ? diff : 0;
}

/** An ISO instant as "12 November 2026" in Kerala time. */
export function formatInstantDate(instant: string): string {
  const value = new Date(instant);
  if (Number.isNaN(value.getTime())) return instant;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(value);
}
