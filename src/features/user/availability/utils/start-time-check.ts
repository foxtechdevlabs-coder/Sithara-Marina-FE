/*
 * Checks on a start time the customer typed, from what the backend already said
 * about the day (GET /yachts/{slug}/slots) and the yacht's hours. Never a
 * decision of its own: a start that passes is still checked by the backend's
 * quote, which is the authority (overlaps, turnaround, holds, blocks, price).
 */

/** The slot fields used here (GET /yachts/{slug}/slots `slots[]`). */
export interface SlotWindow {
  start_time: string;
  end_time: string;
  state: "available" | "booked" | "held" | "blocked" | "past";
}

/** "08:30" → 510. Null for anything that is not HH:mm. */
export function toMinutes(time: string | null | undefined): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(time ?? "");
  if (!match) return null;
  const minutes = Number(match[1]) * 60 + Number(match[2]);
  return minutes < 24 * 60 ? minutes : null;
}

/** 510 → "08:30". */
export function fromMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export interface StartRange {
  /** HH:mm, the first start allowed. */
  earliest: string;
  /** HH:mm, the last start that is still back by closing. */
  latest: string;
}

/**
 * The starts a package of this length allows: from opening, to closing minus its
 * length (the yacht's own hours, which the backend keeps within its daily limits).
 * Null when the hours are unknown or the package does not fit the day.
 */
export function allowedStartRange(
  opensAt: string | null | undefined,
  closesAt: string | null | undefined,
  durationMinutes: number | null | undefined,
): StartRange | null {
  const opens = toMinutes(opensAt);
  const closes = toMinutes(closesAt);
  if (opens === null || closes === null || !durationMinutes) return null;
  const latest = closes - durationMinutes;
  if (latest < opens) return null;
  return { earliest: fromMinutes(opens), latest: fromMinutes(latest) };
}

/**
 * States meaning a window overlaps a reservation, a customer's hold, a block or the
 * turnaround around one. "past" is left out on purpose: when a start counts as past
 * (or too soon) is the backend's rule, so a start near one is left to its quote,
 * which refuses a passed start clearly (PAST_DATE_TIME_REJECTED).
 */
const TAKEN: ReadonlySet<SlotWindow["state"]> = new Set(["booked", "held", "blocked"]);

export type StartTimeProblem =
  | { kind: "outside-hours"; range: StartRange }
  | { kind: "overlap"; window: SlotWindow };

/**
 * A clear reason the typed start cannot work, or null when the backend has to be
 * asked. The whole charter, start to start + length, is checked:
 *
 * - outside the package's allowed starts;
 * - containing a window (of any package that day) the backend marks booked, held
 *   or blocked. The backend marks a window so only when it overlaps a
 *   reservation, a hold, a block or the turnaround around one, so any charter that
 *   covers that whole window overlaps it too. No turnaround length or reservation
 *   times are assumed here.
 *
 * Starts that only partly cover such a window are left to the backend, so a start
 * that is really free is never refused here.
 */
export function startTimeProblem({
  start,
  durationMinutes,
  windows,
  range,
}: {
  start: string;
  durationMinutes: number | null | undefined;
  windows: readonly SlotWindow[];
  range: StartRange | null;
}): StartTimeProblem | null {
  const from = toMinutes(start);
  if (from === null || !durationMinutes) return null;
  const to = from + durationMinutes;

  if (range) {
    const earliest = toMinutes(range.earliest) ?? 0;
    const latest = toMinutes(range.latest) ?? 24 * 60;
    if (from < earliest || from > latest) return { kind: "outside-hours", range };
  }

  const covered = windows.find((window) => {
    if (!TAKEN.has(window.state)) return false;
    const windowFrom = toMinutes(window.start_time);
    const windowTo = toMinutes(window.end_time);
    return windowFrom !== null && windowTo !== null && windowFrom >= from && windowTo <= to;
  });
  return covered ? { kind: "overlap", window: covered } : null;
}

/**
 * The turnaround the backend named in a BUFFER_TIME_VIOLATION ("The yacht needs 30
 * minutes between charters…"), or null. Only the number is used, never the text.
 */
export function turnaroundMinutes(message: string | null | undefined): number | null {
  const match = /needs\s+(\d+)\s+minutes?/i.exec(message ?? "");
  return match ? Number(match[1]) : null;
}

/** "between 05:00 and 16:00" from an OUTSIDE_OPERATING_HOURS message, or null. */
export function rangeFromMessage(message: string | null | undefined): StartRange | null {
  const match = /between\s+(\d{2}:\d{2})\s+and\s+(\d{2}:\d{2})/i.exec(message ?? "");
  return match?.[1] && match[2] ? { earliest: match[1], latest: match[2] } : null;
}
