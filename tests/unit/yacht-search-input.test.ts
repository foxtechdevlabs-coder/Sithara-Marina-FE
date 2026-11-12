import { describe, expect, it } from "vitest";

import {
  filtersToQuery,
  guestDigits,
  parseFilters,
  parseGuestCount,
  toListParams,
} from "@/components/user/yacht-search";

describe("typed guest count", () => {
  it("keeps digits only while typing, at most four", () => {
    expect(guestDigits("1a2-")).toBe("12");
    expect(guestDigits("123456")).toBe("1234");
    expect(guestDigits("abc")).toBe("");
  });

  it("accepts any whole number, the way GET /yachts `guests` does", () => {
    expect(parseGuestCount("150")).toBe("150");
    expect(parseGuestCount(" 007 ")).toBe("7");
  });

  it("treats 0 as any guests, and refuses anything else", () => {
    expect(parseGuestCount("0")).toBe("");
    expect(parseGuestCount("2.5")).toBeNull();
    expect(parseGuestCount("-3")).toBeNull();
    expect(parseGuestCount("ten")).toBeNull();
  });

  it("sends a typed count and a chosen city as the backend's own parameters", () => {
    const filters = parseFilters({ region: "kochi", guests: "150" });
    expect(filtersToQuery(filters)).toBe("?region=kochi&guests=150");
    expect(toListParams(filters)).toEqual({ destination: "kochi", guests: 150 });
  });
});
