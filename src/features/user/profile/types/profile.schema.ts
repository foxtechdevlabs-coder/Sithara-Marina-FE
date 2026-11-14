import { z } from "zod";

import { emailSchema } from "@/validation/email";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { error: `Keep this under ${max} characters.` });

/** Editable fields of the "Your details" form. Billing fields are optional. */
export const profileDetailsSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, { error: "Enter your full name." })
    .max(120, { error: "Keep your name under 120 characters." }),
  email: emailSchema,
  phone: z
    .string()
    .trim()
    .max(24, { error: "Enter a valid phone number." })
    .regex(/^(\+?[\d\s()-]{6,})?$/, {
      error: "Enter a valid phone number, including country code.",
    }),
  country: optionalText(80),
  billingAddress: optionalText(200),
  city: optionalText(80),
  state: optionalText(80),
  postalCode: optionalText(12),
});

export type ProfileDetails = z.infer<typeof profileDetailsSchema>;
export type ProfileField = keyof ProfileDetails;

/** A signed-in customer's profile as returned by the account API. */
export const customerProfileSchema = profileDetailsSchema.extend({
  isEmailVerified: z.boolean(),
  avatarUrl: z.string().nullable(),
});

export type CustomerProfile = z.infer<typeof customerProfileSchema>;

/** Profile photo rules: JPG or PNG, at most 5 MB. */
export const PROFILE_PHOTO_TYPES = ["image/jpeg", "image/png"] as const;
export const PROFILE_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
