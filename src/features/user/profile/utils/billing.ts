import { COUNTRY_CODES } from "@/lib/country-codes";
import type { AccountUser, BillingDetails } from "@/services/user/profile.service";

/**
 * The billing fields the "Your details" form shows (Figma C52). The invoice
 * name is the customer's full name and the country is the form's Country /
 * region field; company name, address line 2 and GSTIN have no field, so any
 * saved value is sent back unchanged (PATCH /me replaces the whole object).
 */
export interface BillingValues {
  addressLine1: string;
  city: string;
  state: string;
  postalCode: string;
}

export type BillingField = keyof BillingValues;
export type BillingSaved = AccountUser["billing"];

export const EMPTY_BILLING: BillingValues = {
  addressLine1: "",
  city: "",
  state: "",
  postalCode: "",
};

const INDIA = "IN";

/** The country's name for a 2-letter code; the code itself when it isn't in the list. */
export function countryName(code: string | null | undefined): string {
  if (!code) return "";
  return COUNTRY_CODES.find((country) => country.iso === code.toUpperCase())?.name ?? code;
}

export function billingValuesOf(billing: BillingSaved): BillingValues {
  if (!billing) return EMPTY_BILLING;
  return {
    addressLine1: billing.address_line1 ?? "",
    city: billing.city ?? "",
    state: billing.state ?? "",
    postalCode: billing.postal_code ?? "",
  };
}

/** True when no billing field is filled in: the customer has no billing details. */
export function isBillingEmpty(values: BillingValues): boolean {
  return (Object.keys(values) as BillingField[]).every((key) => values[key].trim() === "");
}

/**
 * Field errors before saving: the rules PATCH /me enforces for `billing`.
 * `country` is the form's Country / region field (reported under "country").
 */
export function validateBilling(
  values: BillingValues,
  country: string,
): Partial<Record<BillingField | "country", string>> {
  if (isBillingEmpty(values)) return {};
  const errors: Partial<Record<BillingField | "country", string>> = {};
  if (!values.addressLine1.trim()) errors.addressLine1 = "Please enter your billing address.";
  if (!values.city.trim()) errors.city = "Please enter your city.";
  if (!country) errors.country = "Choose your country to save billing details.";
  const postalCode = values.postalCode.trim();
  if (!postalCode) errors.postalCode = "Please enter your postal code.";
  if (country === INDIA) {
    if (!values.state.trim()) errors.state = "Please enter your state.";
    if (postalCode && !/^\d{6}$/.test(postalCode)) {
      errors.postalCode = "Enter the 6-digit PIN code.";
    }
  }
  return errors;
}

const orNull = (value: string) => value.trim() || null;

/**
 * The full `billing` object for PATCH /me, or null to remove it. GSTIN is only
 * allowed for India, so a saved one is dropped for any other country.
 */
export function toBillingRequest(
  values: BillingValues,
  context: { fullName: string; country: string; saved: BillingSaved },
): BillingDetails | null {
  if (isBillingEmpty(values)) return null;
  const { saved, country } = context;
  return {
    name: context.fullName.trim(),
    company_name: saved?.company_name ?? null,
    gstin: country === INDIA ? (saved?.gstin ?? null) : null,
    address_line1: values.addressLine1.trim(),
    address_line2: saved?.address_line2 ?? null,
    city: values.city.trim(),
    state: orNull(values.state),
    postal_code: values.postalCode.trim(),
    country,
  };
}

type ServerErrors = Partial<Record<BillingField | "country" | "phone" | "fullName", string>>;

/**
 * Field errors for a 400 on PATCH /me. The validation messages name the field
 * ("billing.postal_code must be …"); the raw text is never shown.
 */
export function billingErrorsFromMessages(text: string): ServerErrors {
  const found: ServerErrors = {};
  if (/phone/i.test(text)) found.phone = "Enter the phone number with its country code.";
  if (/(^|[^.\w])name\b/i.test(text) && !/billing\.name/i.test(text)) {
    found.fullName = "Please check your full name.";
  }
  if (/postal_code/i.test(text)) found.postalCode = "Please check the postal code.";
  if (/address_line1/i.test(text)) found.addressLine1 = "Please check the address.";
  if (/billing\.city/i.test(text)) found.city = "Please check the city.";
  if (/billing\.state/i.test(text)) found.state = "Please check the state.";
  if (/country/i.test(text)) found.country = "Please check the country.";
  return found;
}
