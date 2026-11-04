/**
 * Hands the just-registered email address from /register to /verify-email.
 * Kept in sessionStorage (this tab only, cleared when it closes) rather than
 * the URL, so the address does not end up in history or server logs.
 * The password is never stored.
 */
const STORAGE_KEY = "sithara-marina:pending-verification";

export interface PendingVerification {
  email: string;
  /** Epoch ms before which "Resend" stays locked (backend cooldown / Retry-After). */
  resendAvailableAt?: number;
  /** Set when the account was saved but the first email could not be delivered. */
  notice?: "delivery-failed";
}

const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedValue: PendingVerification | null = null;

export function subscribePendingVerification(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function savePendingVerification(value: PendingVerification): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode, blocked): the page falls back to generic copy.
  }
  for (const listener of listeners) listener();
}

/** Stable snapshot (same object until the stored value changes). */
export function readPendingVerification(): PendingVerification | null {
  let raw: string | null;
  try {
    raw = sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    cachedValue =
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as PendingVerification).email === "string"
        ? (parsed as PendingVerification)
        : null;
  } catch {
    cachedValue = null;
  }
  return cachedValue;
}

export function readPendingVerificationEmail(): string | null {
  return readPendingVerification()?.email ?? null;
}

export function clearPendingVerification(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
  for (const listener of listeners) listener();
}
