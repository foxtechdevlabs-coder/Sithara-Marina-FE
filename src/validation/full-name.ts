import { z } from "zod";

export const FULL_NAME_INVALID_MESSAGE = "Please enter a valid full name.";

/**
 * A person's name as typed: letters from any script (with their accents),
 * spaces, hyphens, apostrophes (' or ’) and full stops, e.g. "Asha Menon",
 * "Jean-Luc", "O'Connor", "José Álvarez", "Zoë", "李小龙". At least one letter
 * is required, so numbers alone ("4466646464646664") and symbols are refused.
 */
const NAME_CHARACTERS = /^[\p{L}\p{M}\s'’.-]+$/u;
const HAS_LETTER = /\p{L}/u;

/** True when the (trimmed) text is a plausible full name. */
export function isValidFullName(value: string): boolean {
  const name = value.trim();
  return name.length > 0 && HAS_LETTER.test(name) && NAME_CHARACTERS.test(name);
}

/**
 * Full name field: trimmed, then checked as above. Length limits stay with each
 * form (the backend's `full_name` allows up to 255 characters).
 */
export const fullNameSchema = z
  .string()
  .trim()
  .min(1, { error: "Enter your full name." })
  .refine(isValidFullName, { error: FULL_NAME_INVALID_MESSAGE });
