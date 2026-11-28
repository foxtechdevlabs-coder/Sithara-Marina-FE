import { describe, expect, it } from "vitest";

import {
  hasRequiredPasswordCharacters,
  PASSWORD_COMBINATION_MESSAGE,
  PASSWORD_LENGTH_MESSAGE,
  PASSWORD_REQUIRED_MESSAGE,
  registrationPasswordProblem,
} from "@/validation/password";

describe("registration password", () => {
  it.each([
    ["abcdefgh", "letters only"],
    ["ABCDEFGH", "capitals only"],
    ["12345678", "numbers only"],
    ["!!!!!!!!", "special characters only"],
    ["abc12345", "no special character"],
    ["abcd@efg", "no number"],
    ["1234@567", "no letter"],
    ["abcd 1234", "a space isn't a special character"],
  ])("refuses %s (%s)", (password) => {
    expect(registrationPasswordProblem(password)).toBe(PASSWORD_COMBINATION_MESSAGE);
  });

  it.each(["abc@1234", "Abc@1234", "pass_word9", "Ünïcødé#1", "a b@1 c d"])("accepts %s", (password) => {
    expect(registrationPasswordProblem(password)).toBeNull();
  });

  it("keeps the existing 8–128 length limits", () => {
    expect(registrationPasswordProblem("")).toBe(PASSWORD_REQUIRED_MESSAGE);
    expect(registrationPasswordProblem("a@1bcde")).toBe(PASSWORD_LENGTH_MESSAGE); // 7
    expect(registrationPasswordProblem("a@1bcdef")).toBeNull(); // 8
    expect(registrationPasswordProblem(`a@1${"x".repeat(125)}`)).toBeNull(); // 128
    expect(registrationPasswordProblem(`a@1${"x".repeat(126)}`)).toBe(PASSWORD_LENGTH_MESSAGE); // 129
  });

  it("explains the rule in plain words", () => {
    expect(PASSWORD_COMBINATION_MESSAGE).toMatch(/letter.*number.*special character/);
    expect(PASSWORD_LENGTH_MESSAGE).toBe("Use between 8 and 128 characters.");
  });

  it("checks each character type on its own", () => {
    expect(hasRequiredPasswordCharacters("a1!")).toBe(true);
    expect(hasRequiredPasswordCharacters("a1")).toBe(false);
    expect(hasRequiredPasswordCharacters("a!")).toBe(false);
    expect(hasRequiredPasswordCharacters("1!")).toBe(false);
  });
});
