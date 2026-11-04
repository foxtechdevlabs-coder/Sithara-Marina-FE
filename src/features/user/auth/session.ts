"use client";

import { useSyncExternalStore } from "react";

import { userRoutes } from "@/constants/routes";
import { isApiError } from "@/services/http/api-error";
import { registerAuthHandlers } from "@/services/http/auth-handlers";
import {
  logoutSession,
  refreshSession,
  type AuthResponse,
  type AuthUser,
} from "@/services/user/auth.service";

import { saveAuthFlash } from "./utils/auth-flash";

/**
 * Customer auth session: the tokens and user returned by the backend after
 * login (POST /auth/login) or email verification (POST /auth/verify-email),
 * renewed through POST /auth/refresh.
 *
 * Storage decision: the backend returns both tokens in the JSON body and sets
 * no cookies, so the frontend must hold them. They are kept in
 * `sessionStorage` — scoped to this tab and cleared when it closes — never in
 * `localStorage`, and never the password. Like any script-readable storage this
 * is exposed to XSS; httpOnly cookies would be stronger but need backend
 * support (see docs/api-integration.md).
 */

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

const STORAGE_KEY = "sithara-marina:auth-session";

const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedSession: AuthSession | null = null;

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function write(session: AuthSession | null) {
  try {
    if (session) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable: the user will need to sign in again.
  }
  notify();
}

/** Current session, or `null` when signed out or storage is unavailable. */
export function readAuthSession(): AuthSession | null {
  let raw: string | null;
  try {
    raw = sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (raw === cachedRaw) return cachedSession; // stable snapshot for useSyncExternalStore
  cachedRaw = raw;
  try {
    cachedSession = raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    cachedSession = null;
  }
  return cachedSession;
}

/** Stores the session returned by login or email verification. */
export function saveAuthSession(response: AuthResponse): void {
  write({
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    user: response.user,
  });
}

export function clearAuthSession(): void {
  write(null);
}

/** React hook: the current customer session (always `null` during SSR). */
export function useAuthSession(): AuthSession | null {
  return useSyncExternalStore(subscribe, readAuthSession, () => null);
}

// ── Refresh, expiry and sign-out ────────────────────────────────────────────

let signingOut = false;

/**
 * Renews the session with the stored refresh token (single use, rotated).
 * Called by the shared HTTP client, which guarantees one refresh at a time.
 * An invalid/revoked token clears the session; a network failure keeps it.
 */
async function refreshStoredSession(): Promise<boolean> {
  const session = readAuthSession();
  if (!session) return false;
  try {
    const response = await refreshSession({ refresh_token: session.refreshToken });
    write({
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      user: response.user ?? session.user,
    });
    return true;
  } catch (error) {
    const unrecoverable =
      isApiError(error) &&
      (error.status === 401 || error.status === 400 || error.kind === "validation");
    if (unrecoverable) clearAuthSession();
    return false;
  }
}

/** Only accept same-site relative paths, to avoid open redirects via `?next=`. */
export function safeNextPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return null;
  }
  return value;
}

/** A protected request failed with 401 and could not be refreshed. */
function handleSessionExpired(): void {
  const hadSession = readAuthSession() !== null;
  clearAuthSession();
  if (signingOut || typeof window === "undefined") return;
  if (window.location.pathname === userRoutes.login) return;

  if (hadSession) saveAuthFlash("Your session has expired. Please sign in again.");
  const next = safeNextPath(window.location.pathname + window.location.search);
  const target = next ? `${userRoutes.login}?next=${encodeURIComponent(next)}` : userRoutes.login;
  window.location.assign(target);
}

/**
 * Signs out: revokes the refresh token on the backend (best effort; the
 * backend answers 204 even when there was nothing to end) and always clears
 * the local session.
 */
export async function signOut(): Promise<void> {
  const session = readAuthSession();
  signingOut = true;
  try {
    if (session) await logoutSession({ refresh_token: session.refreshToken });
  } catch {
    // Offline or token already expired: the local session is cleared regardless.
  } finally {
    clearAuthSession();
    signingOut = false;
  }
}

registerAuthHandlers({
  getAccessToken: () => readAuthSession()?.accessToken ?? null,
  refresh: refreshStoredSession,
  onSessionExpired: handleSessionExpired,
});
