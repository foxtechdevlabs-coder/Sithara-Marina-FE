import { describe, expect, it } from "vitest";

import {
  EMPTY_BILLING,
  billingValuesOf,
  countryName,
  toBillingRequest,
  validateBilling,
} from "@/features/user/profile/utils/billing";
import { notificationPreferencesOf } from "@/services/user/profile.service";

const india = {
  addressLine1: "1 Marine Drive",
  city: "Kochi",
  state: "Kerala",
  postalCode: "682001",
};
const context = { fullName: " Ajin Raj ", country: "IN", saved: null };

describe("billing details", () => {
  it("is null (removed) when nothing is filled in", () => {
    expect(toBillingRequest(EMPTY_BILLING, context)).toBeNull();
    expect(validateBilling(EMPTY_BILLING, "IN")).toEqual({});
  });

  it("requires address, city, postal code and a country once started", () => {
    expect(Object.keys(validateBilling({ ...EMPTY_BILLING, city: "Kochi" }, "")).sort()).toEqual([
      "addressLine1",
      "country",
      "postalCode",
    ]);
  });

  it("requires a state and a 6-digit PIN for India", () => {
    expect(validateBilling({ ...india, state: "", postalCode: "6820" }, "IN")).toEqual({
      state: "Please enter your state.",
      postalCode: "Enter the 6-digit PIN code.",
    });
    expect(validateBilling(india, "IN")).toEqual({});
  });

  it("does not require a state or a PIN format outside India", () => {
    expect(validateBilling({ ...india, state: "", postalCode: "SW1A 1AA" }, "GB")).toEqual({});
  });

  it("sends the full object, named after the customer and in the form's country", () => {
    expect(toBillingRequest(india, context)).toEqual({
      name: "Ajin Raj",
      company_name: null,
      gstin: null,
      address_line1: "1 Marine Drive",
      address_line2: null,
      city: "Kochi",
      state: "Kerala",
      postal_code: "682001",
      country: "IN",
    });
  });

  it("keeps saved company, line 2 and GSTIN, dropping GSTIN outside India", () => {
    const saved = { company_name: "Acme", address_line2: "Floor 2", gstin: "32AAAAA0000A1Z5" };
    expect(toBillingRequest(india, { ...context, saved })).toMatchObject({
      company_name: "Acme",
      address_line2: "Floor 2",
      gstin: "32AAAAA0000A1Z5",
    });
    expect(toBillingRequest(india, { ...context, country: "GB", saved })?.gstin).toBeNull();
  });

  it("reads saved billing back into the form", () => {
    expect(billingValuesOf(null)).toEqual(EMPTY_BILLING);
    expect(billingValuesOf({ address_line1: "B", city: "C" })).toEqual({
      addressLine1: "B",
      city: "C",
      state: "",
      postalCode: "",
    });
  });

  it("shows the country's name for its code", () => {
    expect(countryName("IN")).toBe("India");
    expect(countryName(null)).toBe("");
  });
});

describe("notificationPreferencesOf", () => {
  it("uses the backend defaults for anything left out", () => {
    expect(notificationPreferencesOf({})).toEqual({
      charter_reminders: true,
      offers_and_updates: false,
    });
    expect(
      notificationPreferencesOf({ notification_preferences: { charter_reminders: false } }),
    ).toEqual({ charter_reminders: false, offers_and_updates: false });
  });
});
