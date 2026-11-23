import { notificationPreferencesOf, type AccountUser } from "@/services/user/profile.service";

import { PHONE_FORMAT_HINT, toE164 } from "@/features/user/profile/utils/phone";

/** PATCH /me: `name` up to 255 characters. */
const NAME_MAX = 255;

export type SetupField = "fullName" | "phone";

/** Field errors before saving: the rules PATCH /me enforces. */
export function validateSetup(values: {
  fullName: string;
  phone: string;
}): Partial<Record<SetupField, string>> {
  const found: Partial<Record<SetupField, string>> = {};
  const name = values.fullName.trim();
  if (!name) found.fullName = "Please enter your full name.";
  else if (name.length > NAME_MAX) found.fullName = `Please use up to ${NAME_MAX} characters.`;
  if (values.phone.trim() && !toE164(values.phone)) found.phone = PHONE_FORMAT_HINT;
  return found;
}

/**
 * The setup form's starting values. The server's profile (GET /auth/me) is the
 * source of truth: the copy kept with the session can be older, e.g. after a
 * change made in another tab. `country` is the 2-letter code ("" when not set).
 */
export function setupInitialValues(
  user: Pick<AccountUser, "fullName" | "email" | "phone" | "country" | "notification_preferences">,
) {
  return {
    fullName: user.fullName,
    email: user.email,
    phone: user.phone ?? "",
    country: user.country ?? "",
    offersAndUpdates: notificationPreferencesOf(user).offers_and_updates,
  };
}
