import { describe, expect, it } from "vitest";

import { COUNTRY_CODES, joinPhone, splitPhone } from "@/lib/country-codes";

describe("phone country codes", () => {
  it("has each country once", () => {
    expect(new Set(COUNTRY_CODES.map((c) => c.iso)).size).toBe(COUNTRY_CODES.length);
  });

  it("joins the code and the number into the API's format", () => {
    expect(joinPhone("IN", "98765 43210")).toBe("+919876543210");
    expect(joinPhone("IN", "098765-43210")).toBe("+919876543210");
    expect(joinPhone("AE", "50 123 4567")).toBe("+971501234567");
    expect(joinPhone("IN", "")).toBe("");
  });

  it("splits a saved number by the longest matching code", () => {
    expect(splitPhone("+919876543210")).toEqual({ iso: "IN", national: "9876543210" });
    expect(splitPhone("+971501234567")).toEqual({ iso: "AE", national: "501234567" });
    expect(splitPhone("+447700900123")).toEqual({ iso: "GB", national: "7700900123" });
    expect(splitPhone("9876543210")).toBeNull();
  });

  it("keeps the chosen country when codes are shared", () => {
    expect(splitPhone("+14165550123")?.iso).toBe("US");
    expect(splitPhone("+14165550123", "CA")).toEqual({ iso: "CA", national: "4165550123" });
  });

  it("round-trips", () => {
    for (const phone of ["+919876543210", "+971501234567", "+6591234567"]) {
      const split = splitPhone(phone)!;
      expect(joinPhone(split.iso, split.national)).toBe(phone);
    }
  });
});

describe("phone field characters", () => {
  it("keeps only what a phone number can contain", async () => {
    const { phoneCharacters } = await import("@/lib/input-filters");
    expect(phoneCharacters("abc")).toBe("");
    expect(phoneCharacters("98765abc43210")).toBe("9876543210");
    expect(phoneCharacters("98765 43210")).toBe("98765 43210");
    expect(phoneCharacters("(0484) 123-456")).toBe("(0484) 123-456");
    expect(phoneCharacters("+44 7700 900123")).toBe("+44 7700 900123");
    expect(phoneCharacters("98+76")).toBe("9876");
    expect(phoneCharacters("phone: +91 98765")).toBe("+91 98765");
    expect(phoneCharacters("९८७")).toBe("");
  });
});
