import { z } from "zod";

import { emailSchema } from "@/validation/email";

/** Limits from the backend contract; it stays the authority on the values. */
export const FULL_NAME_MAX_LENGTH = 255;
export const SPECIAL_REQUESTS_MAX_LENGTH = 2000;

const fullName = z
  .string()
  .trim()
  .min(1, { error: "Enter your full name." })
  .max(FULL_NAME_MAX_LENGTH, { error: "That name is too long." });

/** E.164, as the backend requires. Spaces and dashes are forgiven. */
const phone = z
  .string()
  .transform((value) => value.replace(/[\s()-]/g, ""))
  .pipe(
    z.string().regex(/^\+[1-9]\d{6,14}$/, {
      error: "Enter your phone number with its country code, like +919876543210.",
    }),
  );

const specialRequests = z
  .string()
  .trim()
  .max(SPECIAL_REQUESTS_MAX_LENGTH, { error: "Please keep this under 2,000 characters." });

export const contactSchema = z.object({
  full_name: fullName,
  phone,
  special_requests: specialRequests,
});

/** A guest also gives an email; a signed-in customer uses their account's. */
export const guestContactSchema = contactSchema.extend({ email: emailSchema });
