import { MOCK_NOTIFICATION_PREFERENCES, MOCK_PROFILE_EXTRAS } from "./customer-account.mock";

/*
 * TEMPORARY: what a customer changes in the features that have no backend
 * endpoint yet (notification preferences; country and billing details). Kept
 * in this tab's `sessionStorage`, so it never leaves the browser and resets
 * when the tab closes. Delete this file once those endpoints exist.
 */

const STORAGE_KEY = "sithara-marina:mock-account:v2";

export interface MockAccount {
  profile_extras: typeof MOCK_PROFILE_EXTRAS;
  preferences: typeof MOCK_NOTIFICATION_PREFERENCES;
}

const initial = (): MockAccount =>
  structuredClone({
    profile_extras: MOCK_PROFILE_EXTRAS,
    preferences: MOCK_NOTIFICATION_PREFERENCES,
  });

let account: MockAccount | null = null;

export function readMockAccount(): MockAccount {
  if (account) return account;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    account = raw ? { ...initial(), ...(JSON.parse(raw) as Partial<MockAccount>) } : initial();
  } catch {
    account = initial();
  }
  return account;
}

/**
 * Forgets everything kept here. Called whenever the signed-in customer changes
 * (sign-in, sign-out, expired session): the data belongs to no account, so the
 * next customer in this tab must never see it.
 */
export function resetMockAccount(): void {
  account = null;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable: only the in-memory copy existed.
  }
}

export function updateMockAccount(change: (draft: MockAccount) => void): MockAccount {
  const current = readMockAccount();
  change(current);
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Storage unavailable: the change lasts until the page is reloaded.
  }
  return current;
}
