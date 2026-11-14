import { describe, expect, it } from "vitest";

import {
  allowedStartRange,
  rangeFromMessage,
  startTimeProblem,
  turnaroundMinutes,
  type SlotWindow,
} from "@/features/user/availability/utils/start-time-check";

/** Windows of one package length, hourly, as GET /yachts/{slug}/slots lists them. */
const windows = (hours: number, from: number, to: number, taken: (start: number) => boolean) =>
  Array.from({ length: to - from + 1 }, (_, i): SlotWindow => {
    const start = from + i;
    const pad = (h: number) => `${String(h).padStart(2, "0")}:00`;
    return { start_time: pad(start), end_time: pad(start + hours), state: taken(start) ? "booked" : "available" };
  });

// The live data for testing-yacht-2 on 14 Nov: a reservation until 13:00, a 30-minute
// turnaround, so every window touching 05:00–13:30 is "booked".
const day = [
  ...windows(1, 5, 18, (h) => h <= 13),
  ...windows(2, 5, 17, (h) => h <= 13),
  ...windows(3, 5, 16, (h) => h <= 13),
];
const range3h = allowedStartRange("05:00", "19:00", 180);

const check = (start: string, minutes: number, range = range3h, list: SlotWindow[] = day) =>
  startTimeProblem({ start, durationMinutes: minutes, windows: list, range })?.kind ?? null;

describe("allowedStartRange", () => {
  it("runs from opening to closing minus the package length", () => {
    expect(allowedStartRange("05:00", "19:00", 60)).toEqual({ earliest: "05:00", latest: "18:00" });
    expect(allowedStartRange("05:00", "19:00", 180)).toEqual({ earliest: "05:00", latest: "16:00" });
    expect(allowedStartRange("08:00", "19:00", 240)).toEqual({ earliest: "08:00", latest: "15:00" });
    expect(allowedStartRange("05:00", "19:00", 720)).toEqual({ earliest: "05:00", latest: "07:00" });
  });

  it("gives none without hours, or for a package longer than the day", () => {
    expect(allowedStartRange(null, "19:00", 60)).toBeNull();
    expect(allowedStartRange("08:00", "10:00", 180)).toBeNull();
  });
});

describe("startTimeProblem: the whole charter, every package length", () => {
  it("refuses a 3-hour 08:00 start (08:00–11:00) over the reservation", () => {
    expect(check("08:00", 180)).toBe("overlap");
  });

  it("refuses starts between listed hours when the charter covers an unavailable window", () => {
    expect(check("07:30", 180)).toBe("overlap"); // 07:30–10:30 covers 08:00–09:00
    expect(check("12:30", 180)).toBe("overlap"); // 12:30–15:30 covers 13:00–14:00
    expect(check("12:30", 120)).toBe("overlap"); // 2-hour: 12:30–14:30 covers 13:00–14:00
  });

  it("leaves a start that only touches the turnaround to the backend (which accepted 13:30)", () => {
    expect(check("13:30", 60, allowedStartRange("05:00", "19:00", 60))).toBeNull();
    expect(check("13:30", 180)).toBeNull();
  });

  it("accepts starts clear of every unavailable window", () => {
    expect(check("14:00", 180)).toBeNull();
    expect(check("16:00", 180)).toBeNull();
    expect(check("15:15", 60, allowedStartRange("05:00", "19:00", 60))).toBeNull();
  });

  it("refuses starts outside the package's allowed range", () => {
    expect(check("16:01", 180)).toBe("outside-hours");
    expect(check("04:59", 180)).toBe("outside-hours");
    expect(check("18:00", 60, allowedStartRange("05:00", "19:00", 60))).toBeNull();
  });

  it("does not guess from longer windows: a 4-hour window only partly covered is left to the backend", () => {
    // 3rwfe34 on 18 Nov: 09:00–13:00 "booked", yet 10:30–14:30 was accepted by the backend.
    const fourHour: SlotWindow[] = [
      { start_time: "09:00", end_time: "13:00", state: "booked" },
      { start_time: "14:00", end_time: "18:00", state: "available" },
    ];
    const range = allowedStartRange("08:00", "19:00", 240);
    expect(check("10:30", 240, range, fourHour)).toBeNull();
    expect(check("09:00", 240, range, fourHour)).toBe("overlap");
  });

  it("treats booked, held and blocked windows as unavailable, and an unpriced free one as not", () => {
    const one = (state: SlotWindow["state"]): SlotWindow[] => [{ start_time: "10:00", end_time: "11:00", state }];
    for (const state of ["booked", "held", "blocked"] as const) expect(check("09:30", 120, null, one(state))).toBe("overlap");
    expect(check("09:30", 120, null, one("available"))).toBeNull();
  });

  it("leaves starts near a past window to the backend (when a start is too soon is its rule)", () => {
    const past: SlotWindow[] = [{ start_time: "10:00", end_time: "11:00", state: "past" }];
    expect(check("09:30", 120, null, past)).toBeNull();
  });

  it("checks no range at all without the yacht's hours, so no free start is refused for it", () => {
    expect(allowedStartRange(null, null, 180)).toBeNull();
    expect(check("08:15", 180, null, [])).toBeNull();
  });
});

describe("reading the backend's refusals", () => {
  it("takes the turnaround length and the allowed range from the messages", () => {
    expect(turnaroundMinutes("The yacht needs 30 minutes between charters, and this time is too close")).toBe(30);
    expect(turnaroundMinutes("Something else")).toBeNull();
    expect(rangeFromMessage("The 3-hour package can start between 05:00 and 16:00, so it is back by 19:00")).toEqual({
      earliest: "05:00",
      latest: "16:00",
    });
  });
});
