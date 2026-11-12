import { z } from "zod";

import { readMockAccount, updateMockAccount } from "./mocks/customer-account.store";
import { mockError, mockResponse } from "./mocks/mock-response";

/*
 * The signed-in customer's profile, email address, password and notification
 * preferences.
 *
 * MOCK DATA: the NestJS backend has not published these endpoints yet, so each
 * function resolves mock data through the schema the real response must match.
 * When the contract exists, replace each body with an `apiClient` call (bearer
 * auth is attached automatically for signed-in customers) and keep the schemas.
 */

const profileSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  email: z.string(),
  email_verified: z.boolean(),
  phone: z.string().nullable(),
  country: z.string().nullable(),
  photo_url: z.string().nullable(),
  billing: z.object({
    address: z.string().nullable(),
    city: z.string().nullable(),
    state: z.string().nullable(),
    postal_code: z.string().nullable(),
  }),
});
export type CustomerProfile = z.infer<typeof profileSchema>;

export function getMyProfile(signal?: AbortSignal): Promise<CustomerProfile> {
  return mockResponse(profileSchema, readMockAccount().profile, signal);
}

export interface UpdateProfileRequest {
  full_name: string;
  phone: string | null;
  country: string | null;
  /** Left out by the first-time account setup, which has no billing fields. */
  billing?: CustomerProfile["billing"];
}

/** The email address is not editable here: changing it needs a verification flow. */
export function updateMyProfile(request: UpdateProfileRequest): Promise<CustomerProfile> {
  const account = updateMockAccount((draft) => {
    draft.profile = {
      ...draft.profile,
      ...request,
      billing: request.billing ?? draft.profile.billing,
    };
  });
  return mockResponse(profileSchema, account.profile);
}

// ── Email change ────────────────────────────────────────────────────────────

/** Length of the code emailed to the new address. */
export const EMAIL_CODE_LENGTH = 6;

/**
 * Emails a verification code to `email`. The account keeps its current address
 * until `confirmEmailChange` succeeds. 409 `EMAIL_IN_USE` for the current one.
 */
export async function requestEmailChange(email: string): Promise<{ sent_to: string }> {
  const normalized = email.trim().toLowerCase();
  if (normalized === readMockAccount().profile.email.toLowerCase()) {
    return mockError(409, "EMAIL_IN_USE", "This is already your account email");
  }
  updateMockAccount((draft) => {
    draft.pending_email = normalized;
  });
  return mockResponse(z.object({ sent_to: z.string() }), { sent_to: normalized });
}

/**
 * Confirms the new address with its code and makes it the account email.
 * 400 `INVALID_CODE` for a wrong or expired code, or one sent to another address.
 * (Mock: any six digits are accepted for the address the code was sent to.)
 */
export function confirmEmailChange(email: string, code: string): Promise<CustomerProfile> {
  const normalized = email.trim().toLowerCase();
  const { pending_email } = readMockAccount();
  if (pending_email !== normalized || !new RegExp(`^\\d{${EMAIL_CODE_LENGTH}}$`).test(code)) {
    return mockError(400, "INVALID_CODE", "Invalid verification code");
  }
  const account = updateMockAccount((draft) => {
    draft.profile = { ...draft.profile, email: normalized, email_verified: true };
    draft.pending_email = null;
  });
  return mockResponse(profileSchema, account.profile);
}

// ── Password ────────────────────────────────────────────────────────────────

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

/** Resolves when the password was changed. */
export async function changeMyPassword(request: ChangePasswordRequest): Promise<void> {
  await mockResponse(z.object({ changed: z.literal(true) }), {
    changed: request.new_password.length > 0,
  });
}

// ── Notification preferences ────────────────────────────────────────────────

const notificationPreferencesSchema = z.object({
  proposal_emails: z.boolean(),
  whatsapp_updates: z.boolean(),
  stories_and_offers: z.boolean(),
});
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

export function getNotificationPreferences(signal?: AbortSignal): Promise<NotificationPreferences> {
  return mockResponse(notificationPreferencesSchema, readMockAccount().preferences, signal);
}

/** Any subset: the setup page only sends `stories_and_offers`. */
export function updateNotificationPreferences(
  request: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  const account = updateMockAccount((draft) => {
    draft.preferences = { ...draft.preferences, ...request };
  });
  return mockResponse(notificationPreferencesSchema, account.preferences);
}
