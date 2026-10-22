import { z } from "zod";

/**
 * Email address field, used by both customer and staff login forms.
 * Only format is checked here; the backend remains the authority on whether
 * an account exists or is allowed to sign in.
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Enter a valid email address." }));
