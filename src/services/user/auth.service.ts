import { z } from "zod";

import { apiClient } from "@/services/http/api-client";

/*
 * Customer authentication.
 * Contract: the backend's Swagger docs at `<NEXT_PUBLIC_API_BASE_URL>/docs`.
 * Paths are relative to the configured base URL. Request bodies are sent
 * exactly as documented — the backend rejects any extra field with 400.
 *
 * Every call here is a public endpoint (`auth: false`) except logout, so a
 * 401 from e.g. a wrong password is never mistaken for an expired session.
 */

export const AUTH_PATHS = {
  register: "/auth/register",
  verifyEmail: "/auth/verify-email",
  resendVerification: "/auth/resend-verification",
  forgotPassword: "/auth/forgot-password",
  verifyResetLink: "/auth/verify-reset-link",
  resetPassword: "/auth/reset-password",
  login: "/auth/login",
  refresh: "/auth/refresh",
  logout: "/auth/logout",
} as const;

/**
 * The hosted backend can take ~40 s to wake from idle (Render), so these calls
 * get a longer timeout than the client default. A timed-out registration may
 * still have been saved; callers must not report it as a definite failure.
 */
const AUTH_TIMEOUT_MS = 60_000;

const PUBLIC = { auth: false, timeoutMs: AUTH_TIMEOUT_MS } as const;

/** Documented per-email cooldown between auth emails (verification, reset) in seconds. */
export const VERIFICATION_EMAIL_COOLDOWN_SECONDS = 60;
export const AUTH_EMAIL_COOLDOWN_SECONDS = VERIFICATION_EMAIL_COOLDOWN_SECONDS;

/** Password length documented for register and reset-password. */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/** Error codes documented (or observed) for these endpoints. */
export type AuthErrorCode =
  | "EMAIL_EXISTS"
  | "RESEND_COOLDOWN"
  | "TOO_MANY_EMAILS"
  | "SERVICE_UNAVAILABLE"
  | "EMAIL_DELIVERY_FAILED"
  | "INVALID_TOKEN"
  | "INVALID_RESET_TOKEN";

// ── Shared response schemas ─────────────────────────────────────────────────

const authUserSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string(),
  role: z.enum(["customer", "admin", "super_admin"]),
});
export type AuthUser = z.infer<typeof authUserSchema>;

/** `AuthResponseDto` — documented for POST /auth/verify-email. */
const authResponseSchema = z.object({
  /** Access JWT; send as `Authorization: Bearer <token>`. */
  access_token: z.string(),
  /** Opaque, single use; rotate it at POST /auth/refresh. */
  refresh_token: z.string(),
  user: authUserSchema,
});
export type AuthResponse = z.infer<typeof authResponseSchema>;

const messageResponseSchema = z.object({ message: z.string() });
export type MessageResponse = z.infer<typeof messageResponseSchema>;

// ── Register ────────────────────────────────────────────────────────────────

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const registerResponseSchema = z.object({
  user_id: z.string(),
  verification_required: z.boolean(),
});
export type RegisterResponse = z.infer<typeof registerResponseSchema>;

/**
 * POST /auth/register → 201. Errors: 400 validation · 409 `EMAIL_EXISTS` ·
 * 429 `RESEND_COOLDOWN` / `TOO_MANY_EMAILS` (Retry-After) · 503
 * `SERVICE_UNAVAILABLE` / `EMAIL_DELIVERY_FAILED` (account saved, email not sent).
 */
export function registerUser(request: RegisterRequest): Promise<RegisterResponse> {
  const body: RegisterRequest = {
    fullName: request.fullName,
    email: request.email,
    password: request.password,
    confirmPassword: request.confirmPassword,
  };
  return apiClient.post(AUTH_PATHS.register, { ...PUBLIC, body, schema: registerResponseSchema });
}

// ── Verify email ────────────────────────────────────────────────────────────

export interface VerifyEmailRequest {
  /** The `<id>.<secret>` token from the verification link. */
  token: string;
}
export type VerifyEmailResponse = AuthResponse;

/**
 * POST /auth/verify-email → 200, signed in. 400 `INVALID_TOKEN` is the single
 * answer for malformed, unknown, wrong, expired or already-used links.
 */
export function verifyEmail(request: VerifyEmailRequest): Promise<VerifyEmailResponse> {
  const body: VerifyEmailRequest = { token: request.token };
  return apiClient.post(AUTH_PATHS.verifyEmail, { ...PUBLIC, body, schema: authResponseSchema });
}

// ── Resend verification ─────────────────────────────────────────────────────

export interface ResendVerificationRequest {
  email: string;
}

const acceptedResponseSchema = z.object({ accepted: z.boolean() });
export type ResendVerificationResponse = z.infer<typeof acceptedResponseSchema>;

/**
 * POST /auth/resend-verification → 200 `{ accepted: true }` — the same answer
 * whether or not the email has an account. Errors: 429 · 503.
 */
export function resendVerification(
  request: ResendVerificationRequest,
): Promise<ResendVerificationResponse> {
  const body: ResendVerificationRequest = { email: request.email };
  return apiClient.post(AUTH_PATHS.resendVerification, {
    ...PUBLIC,
    body,
    schema: acceptedResponseSchema,
  });
}

// ── Forgot password ─────────────────────────────────────────────────────────

export interface ForgotPasswordRequest {
  email: string;
}
export type ForgotPasswordResponse = MessageResponse;

/**
 * POST /auth/forgot-password → 200 `{ message }` — the same answer whether or
 * not the email has an account. Errors: 400 validation · 429
 * `RESEND_COOLDOWN` / `TOO_MANY_EMAILS` (Retry-After) · 503 `SERVICE_UNAVAILABLE`.
 */
export function requestPasswordReset(
  request: ForgotPasswordRequest,
): Promise<ForgotPasswordResponse> {
  const body: ForgotPasswordRequest = { email: request.email };
  return apiClient.post(AUTH_PATHS.forgotPassword, {
    ...PUBLIC,
    body,
    schema: messageResponseSchema,
  });
}

// ── Verify reset link ───────────────────────────────────────────────────────

export interface VerifyResetLinkRequest {
  /** The `<id>.<secret>` token from the reset email link. */
  token: string;
}

const resetTokenResponseSchema = z.object({
  /** Single use; send it to reset-password. */
  reset_token: z.string(),
  /** Seconds until `reset_token` expires. */
  expires_in: z.number(),
});
export type VerifyResetLinkResponse = z.infer<typeof resetTokenResponseSchema>;

/** POST /auth/verify-reset-link → 200. 400 `INVALID_TOKEN` for any bad link. */
export function verifyResetLink(request: VerifyResetLinkRequest): Promise<VerifyResetLinkResponse> {
  const body: VerifyResetLinkRequest = { token: request.token };
  return apiClient.post(AUTH_PATHS.verifyResetLink, {
    ...PUBLIC,
    body,
    schema: resetTokenResponseSchema,
  });
}

// ── Reset password ──────────────────────────────────────────────────────────

export interface ResetPasswordRequest {
  reset_token: string;
  new_password: string;
  confirm_password: string;
}
export type ResetPasswordResponse = MessageResponse;

/**
 * POST /auth/reset-password → 200 `{ message }`. 400 `INVALID_RESET_TOKEN`
 * (malformed, unknown, wrong, expired, used or superseded) or a validation error.
 */
export function resetPassword(request: ResetPasswordRequest): Promise<ResetPasswordResponse> {
  const body: ResetPasswordRequest = {
    reset_token: request.reset_token,
    new_password: request.new_password,
    confirm_password: request.confirm_password,
  };
  return apiClient.post(AUTH_PATHS.resetPassword, {
    ...PUBLIC,
    body,
    schema: messageResponseSchema,
  });
}

// ── Login ───────────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * UNCONFIRMED SHAPE: Swagger declares no response schema for POST /auth/login.
 * It is validated against `AuthResponseDto` (documented for verify-email, which
 * the docs describe as the same signed-in session). A different shape fails
 * validation instead of creating a half-formed session.
 */
export type LoginResponse = AuthResponse;

/**
 * POST /auth/login. Observed errors: 401 "Invalid email or password" (also for
 * unverified accounts) · 400 validation.
 */
export function loginUser(request: LoginRequest): Promise<LoginResponse> {
  const body: LoginRequest = { email: request.email, password: request.password };
  return apiClient.post(AUTH_PATHS.login, { ...PUBLIC, body, schema: authResponseSchema });
}

// ── Refresh ─────────────────────────────────────────────────────────────────

export interface RefreshRequest {
  refresh_token: string;
}

/**
 * UNCONFIRMED SHAPE: Swagger declares no response schema for POST /auth/refresh.
 * `AuthResponseDto` documents the refresh token as single use and rotated here,
 * so a new `access_token` and `refresh_token` are required; `user` is optional.
 */
const refreshResponseSchema = authResponseSchema.extend({ user: authUserSchema.optional() });
export type RefreshResponse = z.infer<typeof refreshResponseSchema>;

/** POST /auth/refresh. Observed: 401 "Invalid refresh token" (unknown, malformed, used). */
export function refreshSession(request: RefreshRequest): Promise<RefreshResponse> {
  const body: RefreshRequest = { refresh_token: request.refresh_token };
  return apiClient.post(AUTH_PATHS.refresh, { ...PUBLIC, body, schema: refreshResponseSchema });
}

// ── Logout ──────────────────────────────────────────────────────────────────

/**
 * POST /auth/logout (bearer) → 204, also when there was nothing to end.
 * Sent with the current access token and never retried through a refresh
 * (that would rotate the very token being revoked).
 */
export async function logoutSession(request: RefreshRequest): Promise<void> {
  const body: RefreshRequest = { refresh_token: request.refresh_token };
  await apiClient.post(AUTH_PATHS.logout, {
    body,
    timeoutMs: AUTH_TIMEOUT_MS,
    refreshOnUnauthorized: false,
  });
}
