/**
 * Hands the email address and the backend's confirmation message from
 * /forgot-password to /reset-password (same tab only, sessionStorage), so the
 * "Request a new link" button can resend without asking again. Never holds a
 * reset token or password.
 */
const STORAGE_KEY = "sithara-marina:pending-password-reset";

export interface PendingPasswordReset {
  email: string;
  /** The backend's neutral response message from POST /auth/forgot-password. */
  message?: string;
  /** Epoch ms before which another reset email may not be requested. */
  resendAvailableAt?: number;
}

const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedValue: PendingPasswordReset | null = null;

export function subscribePendingPasswordReset(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function savePendingPasswordReset(value: PendingPasswordReset): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Storage unavailable: "Request a new link" falls back to /forgot-password.
  }
  for (const listener of listeners) listener();
}

/** Stable snapshot (same object until the stored value changes). */
export function readPendingPasswordReset(): PendingPasswordReset | null {
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
      typeof (parsed as PendingPasswordReset).email === "string"
        ? (parsed as PendingPasswordReset)
        : null;
  } catch {
    cachedValue = null;
  }
  return cachedValue;
}

export function clearPendingPasswordReset(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
  for (const listener of listeners) listener();
}
