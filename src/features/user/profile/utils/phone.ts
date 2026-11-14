/**
 * "+91 98765 43210" → "+919876543210", the international (E.164) format
 * PATCH /me requires; null when the text is not such a number.
 */
export function toE164(input: string): string | null {
  const compact = input.trim().replace(/[\s().-]/g, "");
  return /^\+[1-9]\d{6,14}$/.test(compact) ? compact : null;
}

export const PHONE_FORMAT_HINT =
  "Please enter your phone number with its country code, e.g. +91 98765 43210.";
