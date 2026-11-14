import { fleetErrorMessage } from "@/features/admin/fleet/utils/fleet-error-message";
import { isApiError } from "@/services/http/api-error";
import type {
  BlockReason,
  CalendarBooking,
  CalendarHold,
  CalendarYacht,
} from "@/services/admin/availability.service";

/* Time zones, wording and overlap checks of the availability screens. */

const REASON_LABEL: Record<string, string> = {
  maintenance: "Scheduled maintenance",
  private_use: "Private use",
  weather: "Weather",
  partner_unavailable: "Partner unavailable",
  other: "Other",
};
const titleCase = (value: string) => value.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

/** "maintenance" → "Scheduled maintenance" */
export const blockReasonLabel = (reason: string) => REASON_LABEL[reason] ?? titleCase(reason);

/** "maintenance" → "Maintenance block", for the calendar list. */
export const blockKindLabel = (reason: string) =>
  `${reason === "maintenance" ? "Maintenance" : blockReasonLabel(reason)} block`;

export const BLOCK_REASON_OPTIONS: { value: BlockReason; label: string }[] = (
  ["maintenance", "private_use", "weather", "partner_unavailable", "other"] as const
).map((value) => ({ value, label: REASON_LABEL[value]! }));

const pad = (n: number) => String(n).padStart(2, "0");

/** Wall-clock parts of an instant in `timeZone`. */
function zonedParts(ms: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(ms));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

/** Offset of `timeZone` from UTC at an instant, in minutes. */
function offsetMinutes(ms: number, timeZone: string): number {
  const p = zonedParts(ms, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60_000);
}

/**
 * A wall-clock time in `timeZone` as an ISO instant with that zone's offset:
 * ("2026-11-17", "08:00", "Asia/Kolkata") → "2026-11-17T08:00:00+05:30".
 */
export function zonedIso(date: string, time: string, timeZone: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  const wall = Date.UTC(y!, m! - 1, d!, h!, min!);
  let offset = offsetMinutes(wall, timeZone);
  offset = offsetMinutes(wall - offset * 60_000, timeZone); // settle around DST changes
  const sign = offset < 0 ? "-" : "+";
  const abs = Math.abs(offset);
  return `${date}T${pad(h!)}:${pad(min!)}:00${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

/** An instant as local date and time in `timeZone`: { date: "2026-11-17", time: "08:00" }. */
export function localParts(iso: string, timeZone: string): { date: string; time: string } {
  const p = zonedParts(new Date(iso).getTime(), timeZone);
  return {
    date: `${p.year}-${pad(p.month)}-${pad(p.day)}`,
    time: `${pad(p.hour)}:${pad(p.minute)}`,
  };
}

/** "2026-11-17" plus `days` days. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y!, m! - 1, d! + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

/** Whole days from `a` to `b` ("YYYY-MM-DD"). */
export function daysBetween(a: string, b: string): number {
  const ms = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y!, m! - 1, d!);
  };
  return Math.round((ms(b) - ms(a)) / 86_400_000);
}

/** "2026-11-17" → "17 November 2026" */
export const dayText = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

/** "17 November 2026 · 08:00" */
export function instantText(iso: string, timeZone: string): string {
  const { date, time } = localParts(iso, timeZone);
  return `${dayText(date)} · ${time}`;
}

/**
 * How a block covers one local day: "All day", "08:00–18:00", "From 20:00"
 * or "Until 10:00"; null when it doesn't touch the day.
 */
export function blockTimeOnDay(
  block: { starts_at: string; ends_at: string },
  date: string,
  timeZone: string,
): string | null {
  const start = localParts(block.starts_at, timeZone);
  const end = localParts(block.ends_at, timeZone);
  // `ends_at` is exclusive: a block ending at midnight doesn't touch that day.
  const lastDay = end.time === "00:00" ? addDays(end.date, -1) : end.date;
  if (date < start.date || date > lastDay) return null;
  const fromStart = date > start.date || start.time === "00:00";
  const toEnd = date < lastDay || end.time === "00:00";
  if (fromStart && toEnd) return "All day";
  if (fromStart) return `Until ${end.time}`;
  if (toEnd) return `From ${start.time}`;
  return `${start.time}–${end.time}`;
}

/** Bookings that still hold their time: everything the calendar lists except finished states. */
const HOLDS_TIME = new Set(["confirmed", "pending_payment"]);

export interface Overlaps {
  bookings: CalendarBooking[];
  holds: CalendarHold[];
}

/**
 * Bookings and live checkout holds in the way of a block from `startsAt` to
 * `endsAt`, including the yacht's turnaround either side, as the backend
 * checks it (409 BLOCK_CONFLICT).
 */
export function findOverlaps(yacht: CalendarYacht, startsAt: string, endsAt: string): Overlaps {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  const gap = yacht.turnaround_minutes * 60_000;
  const hits = (s: string, e: string) =>
    new Date(s).getTime() - gap < end && new Date(e).getTime() + gap > start;
  return {
    bookings: yacht.bookings.filter(
      (b) => HOLDS_TIME.has(b.status) && hits(b.starts_at, b.ends_at),
    ),
    holds: yacht.holds.filter((h) => hits(h.starts_at, h.ends_at)),
  };
}

/** Codes of the availability endpoints, worded for staff. */
const EXPLAINED: Record<string, string> = {
  BLOCK_CONFLICT:
    "A confirmed booking or a live checkout hold is in this time (or its turnaround). Choose another range.",
  INVALID_BLOCK: "Check the times: the end must be after the start, and in the future.",
  INVALID_DATE_RANGE: "The end is before the start.",
  YACHT_NOT_FOUND: "That yacht no longer exists.",
};

/** A short message for a failed availability request. */
export function availabilityErrorMessage(error: unknown): string {
  const code = isApiError(error) ? error.code : undefined;
  if (code && EXPLAINED[code]) return EXPLAINED[code];
  if (isApiError(error) && error.status === 404)
    return "This block no longer exists. It may have been removed.";
  return fleetErrorMessage(error, "This block");
}

export const isBlockConflict = (error: unknown) =>
  isApiError(error) && (error.code === "BLOCK_CONFLICT" || error.status === 409);
