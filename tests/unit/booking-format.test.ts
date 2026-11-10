import { describe, expect, it } from "vitest";

import {
  departureText,
  durationText,
  formatRupees,
  marinaToday,
  monthRange,
  monthRangeLabel,
  parseRupees,
  paymentLabel,
  shiftMonth,
} from "@/features/admin/bookings/utils/booking-format";

describe("booking formats", () => {
  it("formats paise as Indian rupees", () => {
    expect(formatRupees(13_125_000)).toBe("₹ 1,31,250");
    expect(formatRupees(5_050)).toBe("₹ 50.50");
    expect(formatRupees(0)).toBe("₹ 0");
  });

  it("reads typed rupee amounts as paise", () => {
    expect(parseRupees("1,31,250")).toBe(13_125_000);
    expect(parseRupees("₹ 50.5")).toBe(5_050);
    expect(parseRupees("12.345")).toBeNaN();
    expect(parseRupees("abc")).toBeNaN();
    expect(parseRupees("")).toBeNaN();
  });

  it("builds month ranges and labels", () => {
    expect(monthRange("2026-11")).toEqual({ from: "2026-11-01", to: "2026-11-30" });
    expect(monthRange("2028-02")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -2)).toBe("2025-11");
    expect(monthRangeLabel("2026-11")).toBe("01–30 November 2026");
  });

  it("describes departures and durations", () => {
    expect(departureText({ date: "2026-11-12", start_time: "09:00" })).toBe("12 Nov · 09:00");
    expect(durationText("09:00", "13:00")).toBe("4 hours");
    expect(durationText("09:00", "10:00")).toBe("1 hour");
    expect(durationText("09:00", "10:30")).toBe("90 minutes");
  });

  it("uses the marina's date, not the device's", () => {
    // 20:00 UTC on 11 Nov is already 12 Nov in Kochi.
    expect(marinaToday(new Date("2026-11-11T20:00:00Z"))).toBe("2026-11-12");
  });

  it("puts review and refunds ahead of the raw payment status", () => {
    expect(
      paymentLabel({ payment_status: "succeeded", needs_review: false, status: "confirmed" }),
    ).toBe("Paid");
    expect(
      paymentLabel({ payment_status: "succeeded", needs_review: true, status: "confirmed" }),
    ).toBe("Needs review");
    expect(
      paymentLabel({ payment_status: "succeeded", needs_review: false, status: "refunded" }),
    ).toBe("Refunded");
    expect(
      paymentLabel({ payment_status: "weird_new", needs_review: false, status: "confirmed" }),
    ).toBe("Weird new");
  });
});
