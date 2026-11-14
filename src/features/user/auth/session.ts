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
  type RefreshResponse,
} from "@/services/user/auth.service";

import { saveAuthFlash } from "./utils/auth-flash";

/**
 * Customer auth session: the tokens returned by the backend after login
 * (POST /auth/login) or email verification (POST /auth/verify-email), renewed
 * through POST /auth/refresh. Only email verification also returns the user.
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
  /** Present after email verification; POST /auth/login returns no user. */
  user?: AuthUser;
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
export function saveAuthSession(response: Omit<AuthResponse, "user"> & { user?: AuthUser }): void {
  write({
    accessToken: response.access_token,
    refreshToken: response.refresh_token,
    user: response.user,
  });
}

export function clearAuthSession(): void {
  write(null);
}

/**
 * Swaps in the access token POST /me/password returns. The refresh token is
 * kept: the change ends the account's other sessions, not this one.
 */
export function replaceAccessToken(accessToken: string): void {
  const session = readAuthSession();
  if (session) write({ ...session, accessToken });
}

/** Keeps the header's name in step after PATCH /me or an email change. */
export function updateSessionUser(user: AuthUser): void {
  const session = readAuthSession();
  if (session) write({ ...session, user });
}

/** React hook: the current customer session (always `null` during SSR). */
export function useAuthSession(): AuthSession | null {
  return useSyncExternalStore(subscribe, readAuthSession, () => null);
}

// ── Refresh, expiry and sign-out ────────────────────────────────────────────

/** Treat the access token as expired this early: a sleeping backend can take a minute to answer. */
const TOKEN_EXPIRY_MARGIN_MS = 60_000;

/** The refresh request running now. */
let renewal: { refreshToken: string; promise: Promise<RefreshResponse> } | null = null;

/**
 * POST /auth/refresh, shared by everyone asking to renew the same token: it is
 * single use, and a logout must receive the pair a running refresh produces.
 */
function renewTokens(refreshToken: string): Promise<RefreshResponse> {
  if (renewal?.refreshToken !== refreshToken) {
    const promise = refreshSession({ refresh_token: refreshToken }).finally(() => {
      if (renewal?.refreshToken === refreshToken) renewal = null;
    });
    renewal = { refreshToken, promise };
  }
  return renewal.promise;
}

/**
 * Renews the session with the stored refresh token (single use, rotated).
 * An invalid/revoked token clears the session; a network failure keeps it.
 */
async function refreshStoredSession(): Promise<boolean> {
  const session = readAuthSession();
  if (!session) return false;
  try {
    const response = await renewTokens(session.refreshToken);
    // Signed out (or in again) meanwhile: never bring the old session back.
    if (readAuthSession()?.refreshToken !== session.refreshToken) return false;
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
    if (unrecoverable && readAuthSession()?.refreshToken === session.refreshToken) {
      clearAuthSession();
    }
    return false;
  }
}

/** Only accept same-site relative paths, to avoid open redirects via `?next=`. */
export function safeNextPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.includes("\\")) return null;
  // Resolved the way a browser will: it drops tabs and newlines, so a value like
  // "/\t/evil.example" looks relative here but really means "//evil.example".
  const base = "https://same-site.invalid";
  try {
    return new URL(value, base).origin === base ? value : null;
  } catch {
    return null;
  }
}

/** A protected request failed with 401 and could not be refreshed. */
function handleSessionExpired(): void {
  const hadSession = readAuthSession() !== null;
  clearAuthSession();
  if (typeof window === "undefined") return;
  if (window.location.pathname === userRoutes.login) return;

  if (hadSession) saveAuthFlash("Your session has expired. Please sign in again.");
  const next = safeNextPath(window.location.pathname + window.location.search);
  const target = next ? `${userRoutes.login}?next=${encodeURIComponent(next)}` : userRoutes.login;
  window.location.assign(target);
}

/**
 * The tokens to revoke `session` with: the pair from a running refresh, a new
 * pair when the access token has expired, otherwise its own. `null` means the
 * refresh token is already invalid, so there is nothing left to revoke.
 */
async function tokensToRevoke(session: AuthSession): Promise<AuthSession | null> {
  const isRenewing = renewal?.refreshToken === session.refreshToken;
  if (!isRenewing && !isAccessTokenExpired(session.accessToken)) return session;
  try {
    const response = await renewTokens(session.refreshToken);
    return { accessToken: response.access_token, refreshToken: response.refresh_token };
  } catch (error) {
    if (isApiError(error) && (error.status === 401 || error.status === 400)) return null;
    throw error;
  }
}

/**
 * Signs out. The local session is cleared at once, without waiting for the
 * backend, which can take up to a minute to wake. It is then revoked with the
 * captured tokens, so this never touches a session started in the meantime.
 * Resolves `false` when the backend could not confirm the revocation.
 */
export async function signOut(): Promise<boolean> {
  const session = readAuthSession();
  clearAuthSession();
  if (!session) return true;
  try {
    const tokens = await tokensToRevoke(session);
    if (tokens) await logoutSession({ refresh_token: tokens.refreshToken }, tokens.accessToken);
    return true;
  } catch {
    return false;
  }
}

/** True unless the access token's JWT `exp` claim shows it is still valid. */
function isAccessTokenExpired(token: string): boolean {
  try {
    const payload = token.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/") ?? "";
    const { exp } = JSON.parse(atob(payload)) as { exp?: unknown };
    return typeof exp !== "number" || exp * 1000 - TOKEN_EXPIRY_MARGIN_MS <= Date.now();
  } catch {
    return true;
  }
}

let storedSessionChecked = false;

/**
 * Runs once per page load. A session restored with an expired access token is
 * renewed through POST /auth/refresh, which also clears it if the refresh token
 * is no longer valid, so an expired session does not stay signed in. Reading the
 * JWT is a local UX check only; the backend still authorizes every request.
 */
export function checkStoredSession(): void {
  if (storedSessionChecked) return; // refresh tokens are single use
  storedSessionChecked = true;
  const session = readAuthSession();
  if (session && isAccessTokenExpired(session.accessToken)) void refreshStoredSession();
}

registerAuthHandlers({
  getAccessToken: () => readAuthSession()?.accessToken ?? null,
  refresh: refreshStoredSession,
  onSessionExpired: handleSessionExpired,
});
