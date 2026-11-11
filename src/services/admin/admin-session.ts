import { z } from "zod";

import { apiClient } from "@/services/http/api-client";
import { isApiError } from "@/services/http/api-error";

/**
 * Admin session tokens (browser only).
 *
 * The backend returns `{ access_token, refresh_token, expires_in }` in the
 * response body (POST /admin/auth/login and /admin/auth/refresh), and expects
 * the access token as `Authorization: Bearer …` and the refresh token in the
 * body of /refresh and /logout. Refresh tokens ROTATE: each one works once and
 * a used one is refused (401). So:
 *
 * - Tokens live in localStorage, so a reload or a new tab restores the session.
 * - Only one refresh runs at a time — within a tab (shared promise) and across
 *   tabs (Web Locks). A tab that waited re-reads storage and reuses the pair
 *   another tab just received instead of sending a now-used refresh token.
 * - Other tabs follow sign-in, refresh and sign-out through `storage` events.
 *
 * Trade-off: tokens in localStorage are readable by any script on the page, so
 * keep the admin area free of third-party scripts and XSS. An httpOnly-cookie
 * session would need backend changes.
 */

const STORAGE_KEY = "sm.admin.session";
const LOCK_NAME = "sm.admin.session.refresh";
/** Refresh this long before the access token expires (at most a quarter of its lifetime). */
const MAX_REFRESH_MARGIN_MS = 30_000;

export const tokenPairSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  /** Access-token lifetime in seconds. */
  expires_in: z.number().positive(),
});
export type TokenPair = z.infer<typeof tokenPairSchema>;

interface StoredSession {
  accessToken: string;
  refreshToken: string;
  /** Epoch milliseconds when the access token expires. */
  expiresAt: number;
  /** Epoch milliseconds after which the access token is refreshed before use. */
  refreshAt: number;
}

const storedSessionSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresAt: z.number(),
  refreshAt: z.number(),
});

/** Why the session ended, for the sign-in screen. */
export type SessionEndReason = "expired" | "signed-out";
type Listener = (reason: SessionEndReason | null) => void;

let current: StoredSession | null = null;
let loaded = false;
let inflight: Promise<boolean> | null = null;
const listeners = new Set<Listener>();

const isBrowser = () => typeof window !== "undefined";

function readStorage(): StoredSession | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = storedSessionSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function writeStorage(session: StoredSession | null) {
  if (!isBrowser()) return;
  try {
    if (session) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode, quota): the session lasts for this page only.
  }
}

function ensureLoaded() {
  if (loaded || !isBrowser()) return;
  loaded = true;
  current = readStorage();
  // Follow sign-in, refresh and sign-out from other tabs.
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    const next = readStorage();
    const wasSignedIn = Boolean(current);
    current = next;
    if (!next && wasSignedIn) emit("signed-out");
    else if (next && !wasSignedIn) emit(null);
  });
}

function emit(reason: SessionEndReason | null) {
  listeners.forEach((listener) => listener(reason));
}

/** Notified when the session starts (`null`) or ends (with a reason). */
export function onSessionChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function hasSession(): boolean {
  ensureLoaded();
  return current !== null;
}

/** Stores a token pair from /login or /refresh. */
export function saveTokens(pair: TokenPair) {
  ensureLoaded();
  const lifetimeMs = pair.expires_in * 1000;
  const now = Date.now();
  current = {
    accessToken: pair.access_token,
    refreshToken: pair.refresh_token,
    expiresAt: now + lifetimeMs,
    refreshAt: now + lifetimeMs - Math.min(MAX_REFRESH_MARGIN_MS, lifetimeMs / 4),
  };
  writeStorage(current);
}

export function getRefreshToken(): string | null {
  ensureLoaded();
  return current?.refreshToken ?? null;
}

/** Forgets the session in every tab. */
export function clearSession(reason: SessionEndReason = "signed-out") {
  ensureLoaded();
  const had = current !== null;
  current = null;
  writeStorage(null);
  if (had) emit(reason);
}

async function withRefreshLock<T>(run: () => Promise<T>): Promise<T> {
  if (isBrowser() && "locks" in navigator && navigator.locks) {
    return navigator.locks.request(LOCK_NAME, run) as Promise<T>;
  }
  return run();
}

/**
 * Exchanges the refresh token for a new pair (POST /admin/auth/refresh).
 * Resolves `true` when a valid access token is available afterwards.
 * A 401 means the session is over: it is cleared and listeners hear "expired".
 * Network failures are rethrown and keep the session for a later retry.
 */
export function refreshSession(): Promise<boolean> {
  ensureLoaded();
  if (inflight) return inflight;
  const startedWith = current?.refreshToken;

  inflight = withRefreshLock(async () => {
    // Another tab may have refreshed while this one waited for the lock.
    const latest = readStorage() ?? current;
    if (!latest) {
      current = null;
      return false;
    }
    if (latest.refreshToken !== startedWith && Date.now() < latest.refreshAt) {
      current = latest;
      return true;
    }
    try {
      const pair = await apiClient.post("/admin/auth/refresh", {
        auth: false,
        body: { refresh_token: latest.refreshToken },
        schema: tokenPairSchema,
        // Often the first call of a visit, while the hosted backend wakes from idle.
        timeoutMs: 60_000,
      });
      saveTokens(pair);
      return true;
    } catch (error) {
      if (isApiError(error) && error.status === 401) {
        clearSession("expired");
        return false;
      }
      throw error;
    }
  }).finally(() => {
    inflight = null;
  });
  return inflight;
}

/**
 * A usable access token, refreshed first when it is about to expire;
 * `null` when signed out.
 */
export async function getAccessToken(): Promise<string | null> {
  ensureLoaded();
  if (!current) return null;
  if (Date.now() >= current.refreshAt) {
    const ok = await refreshSession();
    if (!ok) return null;
  }
  return current?.accessToken ?? null;
}
