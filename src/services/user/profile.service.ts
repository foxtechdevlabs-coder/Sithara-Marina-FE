import { z } from "zod";

import { apiClient } from "@/services/http/api-client";
import { ApiError } from "@/services/http/api-error";

/*
 * The signed-in customer: profile (name, phone, country, billing details,
 * notification preferences), password and email address. Every call needs the customer's bearer token,
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
  /**
   * Profile photo (512×512), or null. A signed link valid for 1 hour: read it
   * from GET /auth/me each time and never store it.
   */
  avatar_url: z.string().nullable().optional(),
  /** ISO 3166-1 alpha-2 code such as "IN", or null when not set. */
  country: z.string().nullable().optional(),
  /** Missing keys mean the defaults (see `notificationPreferencesOf`). */
  notification_preferences: z
    .object({
      charter_reminders: z.boolean().optional(),
      offers_and_updates: z.boolean().optional(),
    })
    .nullable()
    .optional(),
  /** The saved billing details, or null when not set. */
  billing: z
    .object({
      name: z.string().nullable().optional(),
      company_name: z.string().nullable().optional(),
      gstin: z.string().nullable().optional(),
      address_line1: z.string().nullable().optional(),
      address_line2: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
      state: z.string().nullable().optional(),
      postal_code: z.string().nullable().optional(),
      country: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
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
  /** 2-letter ISO 3166-1 code such as "IN"; null clears it. */
  country?: string | null;
  /** Send only the key being changed; the other keys keep their value. */
  notification_preferences?: Partial<NotificationPreferences>;
  /** Always the full object (it replaces the saved one); null removes it. */
  billing?: BillingDetails | null;
}

/** Customer-controlled emails. Booking, payment, refund and cancellation emails always go. */
export interface NotificationPreferences {
  /** The reminder email the day before the charter. On by default. */
  charter_reminders: boolean;
  /** Marketing consent. Off by default. */
  offers_and_updates: boolean;
}

/** The saved preferences, with the backend defaults for anything it left out. */
export function notificationPreferencesOf(
  user: Pick<AccountUser, "notification_preferences">,
): NotificationPreferences {
  const saved = user.notification_preferences;
  return {
    charter_reminders: saved?.charter_reminders ?? true,
    offers_and_updates: saved?.offers_and_updates ?? false,
  };
}

/**
 * Required: name, address_line1, city, postal_code, country. For India ("IN"):
 * `state` is required, `postal_code` is a 6-digit PIN and `gstin` is optional
 * (it is only allowed for India).
 */
export interface BillingDetails {
  name: string;
  company_name: string | null;
  gstin: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string | null;
  postal_code: string;
  country: string;
}

/**
 * PATCH /me. Everything is optional. 400 (and nothing saved) for a blank name,
 * a phone not in E.164 format, an invalid country, billing or preference, or any
 * other field.
 */
export function updateMyProfile(request: UpdateProfileRequest): Promise<AccountUser> {
  return apiClient.patch("/me", { body: request, schema: accountUserSchema });
}

// ── Profile photo ───────────────────────────────────────────────────────────

/** What POST /me/avatar/uploads accepts: JPEG, PNG or WebP, up to 2 MB (exact bytes). */
export const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

/** Why this file can't be a profile photo, or null. */
export function avatarProblem(file: File): string | null {
  if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) {
    return "Please choose a JPG, PNG or WebP image.";
  }
  if (file.size > AVATAR_MAX_BYTES) return "Please choose an image of 2 MB or less.";
  if (file.size === 0) return "This file is empty. Please choose another image.";
  return null;
}

const avatarUploadTicketSchema = z.object({
  media_id: z.string(),
  /** PUT the raw file here with the same Content-Type. */
  upload_url: z.string(),
  expires_in: z.number(),
});

/** AvatarResponseDto: `avatar_url` is nullable in the spec. */
const avatarResponseSchema = z.object({ avatar_url: z.string().nullable() });

/** PUTs the raw file (not a form) to the signed storage link. No bearer token. */
async function putToSignedUrl(url: string, file: File, signal?: AbortSignal): Promise<void> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
      signal,
    });
  } catch (cause) {
    if (signal?.aborted) throw new ApiError("Upload cancelled", { kind: "aborted", cause });
    throw new ApiError("Upload failed: network error", { kind: "network", cause });
  }
  if (!response.ok) {
    throw new ApiError(`Upload failed (${response.status})`, {
      kind: "http",
      status: response.status,
    });
  }
}

/**
 * Uploads and sets the profile photo; returns the new (1-hour) `avatar_url`.
 * POST /me/avatar/uploads → PUT the file to `upload_url` → PUT /me/avatar.
 * The server crops it to a 512×512 square. 400 `INVALID_MEDIA` comes with a
 * readable message (e.g. "The image is smaller than 32 pixels on a side").
 */
export async function uploadMyAvatar(file: File, signal?: AbortSignal): Promise<string | null> {
  const ticket = await apiClient.post("/me/avatar/uploads", {
    body: { content_type: file.type, size_bytes: file.size },
    schema: avatarUploadTicketSchema,
    signal,
  });
  await putToSignedUrl(ticket.upload_url, file, signal);
  const { avatar_url } = await apiClient.put("/me/avatar", {
    body: { media_id: ticket.media_id },
    schema: avatarResponseSchema,
    signal,
  });
  return avatar_url;
}

/** DELETE /me/avatar (204): removes the profile photo. */
export async function removeMyAvatar(): Promise<void> {
  await apiClient.delete("/me/avatar");
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
