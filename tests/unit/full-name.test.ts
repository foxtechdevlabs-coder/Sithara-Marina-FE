import { describe, expect, it } from "vitest";

import { FULL_NAME_INVALID_MESSAGE, fullNameSchema, isValidFullName } from "@/validation/full-name";

describe("full name validation", () => {
  it.each(["123456", "4466646464646664", "9876543210", "  12345  ", "12-34", "+91 98765"])(
    "rejects a name with no letters: %j",
    (value) => {
      expect(isValidFullName(value)).toBe(false);
      const result = fullNameSchema.safeParse(value);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe(FULL_NAME_INVALID_MESSAGE);
    },
  );

  it.each(["", "   ", "\t\n"])("rejects an empty or whitespace-only name: %j", (value) => {
    expect(isValidFullName(value)).toBe(false);
    expect(fullNameSchema.safeParse(value).error?.issues[0]?.message).toBe("Enter your full name.");
  });

  it.each([
    ["a normal full name", "Asha Menon"],
    ["a single-word name", "Madonna"],
    ["a hyphenated name", "Jean-Luc Picard"],
    ["an apostrophe", "O'Connor"],
    ["a typographic apostrophe", "D’Souza"],
    ["accents", "José Álvarez"],
    ["a diaeresis", "Zoë Brontë"],
    ["Malayalam", "അനന്യ മേനോൻ"],
    ["Devanagari", "अनन्या मेनन"],
    ["Chinese", "李小龙"],
    ["Arabic", "محمد علي"],
    ["an initial", "J. R. Rao"],
  ])("accepts %s: %j", (_label, value) => {
    expect(isValidFullName(value)).toBe(true);
    expect(fullNameSchema.safeParse(value).success).toBe(true);
  });

  it("trims spaces around the name before checking and keeping it", () => {
    expect(fullNameSchema.parse("  Asha Menon  ")).toBe("Asha Menon");
  });

  it("refuses digits or symbols mixed into a name", () => {
    expect(isValidFullName("Asha123")).toBe(false);
    expect(isValidFullName("Asha <script>")).toBe(false);
    expect(isValidFullName("asha@example.com")).toBe(false);
  });
});
