import { describe, expect, it } from "vitest";

import {
  addDays,
  blockKindLabel,
  blockReasonLabel,
  blockTimeOnDay,
  daysBetween,
  findOverlaps,
  instantText,
  localParts,
  zonedIso,
} from "@/features/admin/availability/utils/availability-format";
import type { CalendarYacht } from "@/services/admin/availability.service";

const TZ = "Asia/Kolkata";

describe("availability time zones", () => {
  it("sends marina wall-clock times with the marina's offset", () => {
    expect(zonedIso("2026-11-17", "08:00", TZ)).toBe("2026-11-17T08:00:00+05:30");
    expect(zonedIso("2026-11-17", "00:00", "UTC")).toBe("2026-11-17T00:00:00+00:00");
    // New York is UTC-5 in November and UTC-4 in July.
    expect(zonedIso("2026-11-17", "08:00", "America/New_York")).toBe("2026-11-17T08:00:00-05:00");
    expect(zonedIso("2026-07-01", "08:00", "America/New_York")).toBe("2026-07-01T08:00:00-04:00");
  });

  it("reads instants back as marina dates and times", () => {
    expect(localParts("2026-11-17T02:30:00Z", TZ)).toEqual({ date: "2026-11-17", time: "08:00" });
    expect(localParts("2026-11-16T20:00:00Z", TZ)).toEqual({ date: "2026-11-17", time: "01:30" });
    expect(instantText("2026-11-17T02:30:00Z", TZ)).toBe("17 November 2026 · 08:00");
  });

  it("does date arithmetic across months", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(daysBetween("2026-11-01", "2026-12-13")).toBe(42);
  });
});

describe("blocks on a day", () => {
  const block = (starts: string, ends: string) => ({
    starts_at: zonedIso(starts.slice(0, 10), starts.slice(11), TZ),
    ends_at: zonedIso(ends.slice(0, 10), ends.slice(11), TZ),
  });

  it("describes part-day, whole-day and multi-day blocks", () => {
    const part = block("2026-11-17T08:00", "2026-11-17T18:00");
    expect(blockTimeOnDay(part, "2026-11-17", TZ)).toBe("08:00–18:00");
    expect(blockTimeOnDay(part, "2026-11-18", TZ)).toBeNull();

    // Ending at midnight doesn't touch the next day.
    const day = block("2026-11-17T00:00", "2026-11-18T00:00");
    expect(blockTimeOnDay(day, "2026-11-17", TZ)).toBe("All day");
    expect(blockTimeOnDay(day, "2026-11-18", TZ)).toBeNull();

    const multi = block("2026-11-17T20:00", "2026-11-19T10:00");
    expect(blockTimeOnDay(multi, "2026-11-17", TZ)).toBe("From 20:00");
    expect(blockTimeOnDay(multi, "2026-11-18", TZ)).toBe("All day");
    expect(blockTimeOnDay(multi, "2026-11-19", TZ)).toBe("Until 10:00");
  });

  it("words reasons for staff", () => {
    expect(blockReasonLabel("maintenance")).toBe("Scheduled maintenance");
    expect(blockKindLabel("maintenance")).toBe("Maintenance block");
    expect(blockKindLabel("private_use")).toBe("Private use block");
    expect(blockReasonLabel("dry_dock")).toBe("Dry dock");
  });
});

describe("findOverlaps", () => {
  const booking = (id: string, status: string, start: string, end: string) => ({
    id,
    reference: id,
    status,
    starts_at: zonedIso("2026-11-12", start, TZ),
    ends_at: zonedIso("2026-11-12", end, TZ),
    date: "2026-11-12",
    start_time: start,
    end_time: end,
    slot_type_name: "4-hour",
    contact_name: "Ananya Menon",
    guest_count: 8,
    payment_due_by: null,
  });
  const yacht: CalendarYacht = {
    id: "y1",
    name: "Astra One",
    is_active: true,
    turnaround_minutes: 60,
    bookings: [
      booking("SM-1", "confirmed", "09:00", "13:00"),
      booking("SM-2", "completed", "09:00", "13:00"),
      booking("SM-3", "pending_payment", "16:00", "18:00"),
    ],
    holds: [],
    blocks: [],
    free_windows: [],
  };
  const range = (s: string, e: string) =>
    findOverlaps(yacht, zonedIso("2026-11-12", s, TZ), zonedIso("2026-11-12", e, TZ));

  it("finds bookings that still hold their time, including turnaround", () => {
    expect(range("10:00", "11:00").bookings.map((b) => b.id)).toEqual(["SM-1"]);
    // 13:30 is inside the 60-minute turnaround after SM-1.
    expect(range("13:30", "14:00").bookings.map((b) => b.id)).toEqual(["SM-1"]);
    expect(range("14:00", "15:00").bookings).toEqual([]);
    expect(range("14:00", "15:30").bookings.map((b) => b.id)).toEqual(["SM-3"]);
  });
});
