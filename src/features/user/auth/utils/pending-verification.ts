/**
 * Hands the just-registered email address from /register to /verify-email.
 * Kept in sessionStorage (this tab only, cleared when it closes) rather than
 * the URL, so the address does not end up in history or server logs.
 */
const STORAGE_KEY = "sithara-marina:pending-verification-email";

export function savePendingVerificationEmail(email: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, email);
  } catch {
    // Storage unavailable (private mode, blocked): the page falls back to generic copy.
  }
}

export function readPendingVerificationEmail(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearPendingVerificationEmail(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}
