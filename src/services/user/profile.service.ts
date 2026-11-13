import { z } from "zod";

import { apiClient } from "@/services/http/api-client";

import { readMockAccount, updateMockAccount } from "./mocks/customer-account.store";
import { mockResponse } from "./mocks/mock-response";

/*
 * The signed-in customer: profile, password, email address and (mock)
 * notification preferences. Every call needs the customer's bearer token,
 * which `apiClient` attaches (and refreshes once on a 401). Error codes are on
 * `ApiError.code`; each function lists the ones the backend documents.
 */

// ── Profile ─────────────────────────────────────────────────────────────────

/** `UserDto`: what PATCH /me and POST /me/email/verify return. */
const accountUserSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string(),
  phone: z.string().nullable().optional(),
  role: z.enum(["customer", "admin", "super_admin"]),
});
export type AccountUser = z.infer<typeof accountUserSchema>;

/**
 * GET /auth/me. The spec documents no response body for it; it is read as the
 * same `UserDto` as PATCH /me (a `{ user }` wrapper is also accepted).
 */
const authMeSchema = z.preprocess(
  (value) =>
    value && typeof value === "object" && "user" in value
      ? (value as { user: unknown }).user
      : value,
  accountUserSchema,
);

export function getMyProfile(signal?: AbortSignal): Promise<AccountUser> {
  return apiClient.get("/auth/me", { signal, schema: authMeSchema });
}

export interface UpdateProfileRequest {
  /** Up to 255 characters, not blank. */
  name?: string;
  /** International format (E.164, e.g. "+919876543210"); null removes it. */
  phone?: string | null;
}

/** PATCH /me. 400 for a blank name, a phone not in E.164 format, or any other field. */
export function updateMyProfile(request: UpdateProfileRequest): Promise<AccountUser> {
  return apiClient.patch("/me", { body: request, schema: accountUserSchema });
}

// ── Profile details without an endpoint (TEMPORARY, mock) ───────────────────

/**
 * Country and billing details. PATCH /me does not accept them and no other
 * endpoint stores them, so they stay in this browser tab only (mock).
 * See docs/missing-customer-apis.md.
 */
export interface ProfileExtras {
  country: string | null;
  billing: {
    address: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
  };
}

const profileExtrasSchema = z.object({
  country: z.string().nullable(),
  billing: z.object({
    address: z.string().nullable(),
    city: z.string().nullable(),
    state: z.string().nullable(),
    postal_code: z.string().nullable(),
  }),
});

export function getProfileExtras(signal?: AbortSignal): Promise<ProfileExtras> {
  return mockResponse(profileExtrasSchema, readMockAccount().profile_extras, signal);
}

export function updateProfileExtras(extras: Partial<ProfileExtras>): Promise<ProfileExtras> {
  const account = updateMockAccount((draft) => {
    draft.profile_extras = { ...draft.profile_extras, ...extras };
  });
  return mockResponse(profileExtrasSchema, account.profile_extras);
}

// ── Password ────────────────────────────────────────────────────────────────

export interface ChangePasswordRequest {
  current_password: string;
  /** 8–128 characters. */
  new_password: string;
}

const changePasswordResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
});
export type ChangePasswordResponse = z.infer<typeof changePasswordResponseSchema>;

/**
 * POST /me/password. Returns a fresh access token for this session: store it
 * (the account's other sessions are ended). 400 `INVALID_CURRENT_PASSWORD`,
 * `PASSWORD_UNCHANGED` or a validation error.
 */
export function changeMyPassword(request: ChangePasswordRequest): Promise<ChangePasswordResponse> {
  return apiClient.post("/me/password", { body: request, schema: changePasswordResponseSchema });
}

// ── Email change ────────────────────────────────────────────────────────────

const emailChangeResponseSchema = z.object({ verification_required: z.boolean() });
export type EmailChangeResponse = z.infer<typeof emailChangeResponseSchema>;

/**
 * POST /me/email/change: emails a verification link to the new address; the
 * account keeps its current email until that link is confirmed.
 * 400 `EMAIL_UNCHANGED` · 409 `EMAIL_EXISTS` · 429 `RESEND_COOLDOWN` /
 * `TOO_MANY_EMAILS` (see `retryAfterSeconds`) · 503 `EMAIL_DELIVERY_FAILED`.
 */
export function requestEmailChange(newEmail: string): Promise<EmailChangeResponse> {
  return apiClient.post("/me/email/change", {
    body: { new_email: newEmail },
    schema: emailChangeResponseSchema,
  });
}

/**
 * POST /me/email/verify with the `<id>.<secret>` token from the emailed link.
 * 400 `INVALID_TOKEN` (wrong, expired, used, or another customer's) · 409 `EMAIL_EXISTS`.
 */
export function verifyEmailChange(token: string): Promise<AccountUser> {
  return apiClient.post("/me/email/verify", { body: { token }, schema: accountUserSchema });
}

// ── Notification preferences (TEMPORARY, mock) ──────────────────────────────

/*
 * No notification-preference endpoint exists (see docs/missing-customer-apis.md),
 * so these stay in this browser tab only.
 */

const notificationPreferencesSchema = z.object({
  proposal_emails: z.boolean(),
  whatsapp_updates: z.boolean(),
  stories_and_offers: z.boolean(),
});
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;

export function getNotificationPreferences(signal?: AbortSignal): Promise<NotificationPreferences> {
  return mockResponse(notificationPreferencesSchema, readMockAccount().preferences, signal);
}

export function updateNotificationPreferences(
  request: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  const account = updateMockAccount((draft) => {
    draft.preferences = { ...draft.preferences, ...request };
  });
  return mockResponse(notificationPreferencesSchema, account.preferences);
}
