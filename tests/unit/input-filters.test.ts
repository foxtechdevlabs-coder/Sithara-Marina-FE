import { describe, expect, it } from "vitest";

import {
  amountCharacters,
  digitsOnly,
  keepOnly,
  percentCharacters,
  phoneCharacters,
  yearsCharacters,
} from "@/lib/input-filters";

describe("number field filters", () => {
  it("keeps whole numbers only", () => {
    expect(digitsOnly("12abc")).toBe("12");
    expect(digitsOnly("1e5")).toBe("15");
    expect(digitsOnly("-3")).toBe("3");
  });

  it("keeps rupee amounts with one dot and two decimals", () => {
    expect(amountCharacters("₹ 20,000.50")).toBe("20,000.50");
    expect(amountCharacters("abc")).toBe("");
    expect(amountCharacters("12.345")).toBe("12.34");
    expect(amountCharacters("1.2.3")).toBe("1.23");
    expect(amountCharacters("1,5x00")).toBe("1,500");
  });

  it("keeps percentages", () => {
    expect(percentCharacters("12.5%")).toBe("12.5");
    expect(percentCharacters("ten")).toBe("");
    expect(percentCharacters("1,5")).toBe("15");
    expect(percentCharacters("33.333")).toBe("33.33");
  });

  it("keeps years", () => {
    expect(yearsCharacters("2019 / 2024")).toBe("2019 / 2024");
    expect(yearsCharacters("built 2019")).toBe(" 2019");
  });

  it("keeps phone characters", () => {
    expect(phoneCharacters("abc")).toBe("");
    expect(phoneCharacters("+91 98765-43210")).toBe("+91 98765-43210");
    expect(phoneCharacters("98+76")).toBe("9876");
  });

  it("filters an uncontrolled input as it's typed", () => {
    const el = { value: "+91 98x76" };
    keepOnly(phoneCharacters)({ currentTarget: el } as never);
    expect(el.value).toBe("+91 9876");
  });
});
