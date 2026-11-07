import { describe, expect, it } from "vitest";

import { clampTime, formatTime, fromParts, parseTime, toParts } from "@/lib/time";

describe("12-hour times", () => {
  it("formats 24-hour times", () => {
    expect(formatTime("05:00")).toBe("5:00 AM");
    expect(formatTime("19:00")).toBe("7:00 PM");
    expect(formatTime("12:30")).toBe("12:30 PM");
    expect(formatTime("00:15")).toBe("12:15 AM");
    expect(formatTime("")).toBe("");
  });

  it("reads 12-hour and 24-hour text", () => {
    expect(parseTime("5:30 PM")).toBe("17:30");
    expect(parseTime("5 pm")).toBe("17:00");
    expect(parseTime("12:00 AM")).toBe("00:00");
    expect(parseTime("12:15 pm")).toBe("12:15");
    expect(parseTime("9:00")).toBe("09:00");
    expect(parseTime("14:00")).toBe("14:00");
  });

  it("leaves anything that isn't a time for the caller to report", () => {
    for (const bad of ["soon", "25:00", "13:00 PM", "9:75", "9"]) {
      expect(parseTime(bad)).toBe(bad);
    }
  });

  it("round-trips every time of day", () => {
    for (let h = 0; h < 24; h += 1) {
      for (const m of ["00", "15", "30", "45"]) {
        const time = `${String(h).padStart(2, "0")}:${m}`;
        expect(parseTime(formatTime(time))).toBe(time);
        expect(fromParts(toParts(time))).toBe(time);
      }
    }
  });

  it("splits a time into the picker's columns", () => {
    expect(toParts("17:30")).toEqual({ hour: 5, minute: 30, period: "PM" });
    expect(toParts("00:15")).toEqual({ hour: 12, minute: 15, period: "AM" });
    expect(toParts("12:00")).toEqual({ hour: 12, minute: 0, period: "PM" });
    expect(fromParts({ hour: 12, minute: 0, period: "AM" })).toBe("00:00");
    expect(fromParts({ hour: 7, minute: 0, period: "PM" })).toBe("19:00");
  });

  it("keeps a time inside a window", () => {
    expect(clampTime("04:00", "05:00", "19:00")).toBe("05:00");
    expect(clampTime("19:30", "05:00", "19:00")).toBe("19:00");
    expect(clampTime("12:00", "05:00", "19:00")).toBe("12:00");
    expect(clampTime("12:00")).toBe("12:00");
  });
});
