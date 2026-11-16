/*
 * The `<id>.<secret>` token of an email-change link opened while signed out.
 * The account pages first send the visitor to sign in; the token must not ride
 * along in `?next=` (a query string reaches server logs, unlike the link's
 * `#token=`), so it waits in this tab's `sessionStorage` instead: single use,
 * and dropped after 30 minutes. The backend still checks it belongs to the
 * customer who signs in (400 INVALID_TOKEN otherwise).
 */

const STORAGE_KEY = "sithara-marina:pending-email-change";
export const PENDING_EMAIL_CHANGE_MAX_AGE_MS = 30 * 60_000;

export function savePendingEmailChangeToken(token: string, now = Date.now()): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ token, savedAt: now }));
  } catch {
    // Storage unavailable: the customer opens the link again after signing in.
  }
}

/** The waiting token, removed as it is read; null when none or too old. */
export function takePendingEmailChangeToken(now = Date.now()): string | null {
  let raw: string | null;
  try {
    raw = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const { token, savedAt } = JSON.parse(raw) as { token?: unknown; savedAt?: unknown };
    if (typeof token !== "string" || !token || typeof savedAt !== "number") return null;
    return now - savedAt <= PENDING_EMAIL_CHANGE_MAX_AGE_MS ? token : null;
  } catch {
    return null;
  }
}
