import { describe, expect, it } from "vitest";

import { setupInitialValues, validateSetup } from "@/features/user/account/utils/setup-form";
import { PHONE_FORMAT_HINT } from "@/features/user/profile/utils/phone";

// Issues 3 and 7 (audit): the setup page checked no name length, and started
// from the session's copy of the name and email rather than the server's.

describe("setupInitialValues", () => {
  it("starts from the server's profile", () => {
    expect(
      setupInitialValues(
        { fullName: "Ajin R.", email: "new@example.test", phone: "+919876543210" },
        null,
        true,
      ),
    ).toEqual({
      fullName: "Ajin R.",
      email: "new@example.test",
      phone: "+919876543210",
      country: "",
      storiesAndOffers: true,
    });
  });

  it("shows a missing phone as an empty field", () => {
    expect(
      setupInitialValues({ fullName: "A", email: "a@b.test", phone: null }, "India", false),
    ).toMatchObject({ phone: "", country: "India" });
  });
});

describe("validateSetup", () => {
  it("accepts a name and an international phone number", () => {
    expect(validateSetup({ fullName: "Ajin Raj", phone: "+91 98765 43210" })).toEqual({});
  });

  it("requires a name", () => {
    expect(validateSetup({ fullName: "   ", phone: "" }).fullName).toBe(
      "Please enter your full name.",
    );
  });

  it("enforces the 255-character limit of PATCH /me", () => {
    expect(validateSetup({ fullName: "a".repeat(255), phone: "" })).toEqual({});
    expect(validateSetup({ fullName: "a".repeat(256), phone: "" }).fullName).toBe(
      "Please use up to 255 characters.",
    );
  });

  it("requires the country code on a phone number", () => {
    expect(validateSetup({ fullName: "Ajin", phone: "98765 43210" }).phone).toBe(PHONE_FORMAT_HINT);
  });
});
