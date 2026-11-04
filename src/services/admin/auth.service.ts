import { z } from "zod";

import { apiClient } from "@/services/http/api-client";

import { adminApiClient } from "./admin-api-client";
import { clearSession, getRefreshToken, saveTokens, tokenPairSchema } from "./admin-session";

/*
 * Admin authentication endpoints (backend: /admin/auth/*). Request and
 * response shapes follow the backend OpenAPI document (GET /docs-json).
 *
 * login, refresh, forgot-password, verify-reset-link and reset-password are
 * public and use `apiClient`; me and logout need the session (`adminApiClient`).
 */

export const ADMIN_ROLES = ["customer", "admin", "super_admin"] as const;

/** AdminProfileDto — GET /admin/auth/me */
export const adminProfileSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string(),
  role: z.enum(ADMIN_ROLES),
  permissions: z.array(z.string()),
});
export type AdminProfile = z.infer<typeof adminProfileSchema>;

const messageSchema = z.object({ message: z.string() });

/** AdminResetTokenResponseDto — POST /admin/auth/verify-reset-link */
const resetTokenSchema = z.object({
  /** Single use; send it to reset-password. */
  reset_token: z.string(),
  /** Seconds until reset_token expires. */
  expires_in: z.number(),
});
export type ResetToken = z.infer<typeof resetTokenSchema>;

/** POST /admin/auth/login — stores the returned token pair. */
export async function login(email: string, password: string): Promise<void> {
  const pair = await apiClient.post("/admin/auth/login", {
    auth: false,
    body: { email, password },
    schema: tokenPairSchema,
  });
  saveTokens(pair);
}

/** GET /admin/auth/me — the signed-in admin's profile and permissions. */
export function getCurrentAdmin(signal?: AbortSignal): Promise<AdminProfile> {
  return adminApiClient.get("/admin/auth/me", { schema: adminProfileSchema, signal });
}

/**
 * POST /admin/auth/logout (204) — ends this session on the server, then
 * forgets it locally. The local session is cleared even if the call fails, so
 * signing out always works.
 */
export async function logout(): Promise<void> {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) {
      await adminApiClient.post("/admin/auth/logout", { body: { refresh_token: refreshToken } });
    }
  } finally {
    clearSession("signed-out");
  }
}

/**
 * POST /admin/auth/forgot-password — STAFF password recovery only. The
 * backend gives the same answer for every email; show its `message`.
 */
export async function requestStaffPasswordReset(email: string): Promise<string> {
  const { message } = await apiClient.post("/admin/auth/forgot-password", {
    auth: false,
    body: { email },
    schema: messageSchema,
  });
  return message;
}

/**
 * POST /admin/auth/verify-reset-link — exchanges the `token` from an emailed
 * reset link (single use) for a short-lived `reset_token`.
 */
export function verifyResetLink(token: string): Promise<ResetToken> {
  return apiClient.post("/admin/auth/verify-reset-link", {
    auth: false,
    body: { token },
    schema: resetTokenSchema,
  });
}

/** POST /admin/auth/reset-password — sets the new password; returns the backend's message. */
export async function resetPassword(input: {
  resetToken: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<string> {
  const { message } = await apiClient.post("/admin/auth/reset-password", {
    auth: false,
    body: {
      reset_token: input.resetToken,
      new_password: input.newPassword,
      confirm_password: input.confirmPassword,
    },
    schema: messageSchema,
  });
  return message;
}
