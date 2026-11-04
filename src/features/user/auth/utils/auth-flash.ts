/**
 * One-time message shown on the sign-in page after a redirect (password reset
 * succeeded, session expired). Kept in sessionStorage so it survives the
 * navigation but is read once and removed. Never holds sensitive data.
 */
const STORAGE_KEY = "sithara-marina:auth-flash";

export function saveAuthFlash(message: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, message);
  } catch {
    // Storage unavailable: the message is simply not shown.
  }
}

export function consumeAuthFlash(): string | null {
  try {
    const message = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    return message;
  } catch {
    return null;
  }
}
