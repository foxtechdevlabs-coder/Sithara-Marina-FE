"use client";

import { useSyncExternalStore } from "react";

import type { CheckoutAddon, CheckoutContact } from "@/services/user/checkout.service";

/**
 * Where a customer is in checkout, so a refresh or a trip to sign in loses
 * nothing. Kept in `sessionStorage` (this tab only, cleared when it closes),
 * like the customer session, and never in the URL. It holds identifiers, the
 * contact details typed so far and a guest's checkout token. No price is
 * stored: every amount is read from the backend when shown.
 */
const STORAGE_KEY = "sithara-marina:checkout";

/** The customer's selection, before a checkout session exists. */
export interface CheckoutDraft {
  yacht: { id: string; slug: string; name: string };
  slot_type_id: string;
  date: string;
  start_time: string;
  guests: number;
  addons: CheckoutAddon[];
}

export interface CheckoutState {
  draft: CheckoutDraft | null;
  contact: CheckoutContact | null;
  sessionId: string | null;
  /** A guest's session waits for the emailed link. */
  awaitingVerification: boolean;
  /** Sent as `X-Checkout-Token`; null when the session is the signed-in customer's. */
  checkoutToken: string | null;
  bookingId: string | null;
  /** Set when an accepted proposal's price changed: the review page says so. */
  proposalPriceChanged?: boolean;
}

const EMPTY: CheckoutState = {
  draft: null,
  contact: null,
  sessionId: null,
  awaitingVerification: false,
  checkoutToken: null,
  bookingId: null,
};

const listeners = new Set<() => void>();
/** Used when storage is unavailable (private mode, blocked). */
let memoryRaw: string | null = null;
let cachedRaw: string | null = null;
let cachedState: CheckoutState = EMPTY;

function readRaw(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY) ?? memoryRaw;
  } catch {
    return memoryRaw;
  }
}

/** Stable snapshot (same object until the stored value changes). */
export function readCheckoutState(): CheckoutState {
  const raw = readRaw();
  if (raw === cachedRaw) return cachedState;
  cachedRaw = raw;
  try {
    cachedState = raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<CheckoutState>) } : EMPTY;
  } catch {
    cachedState = EMPTY;
  }
  return cachedState;
}

function write(state: CheckoutState | null) {
  const raw = state ? JSON.stringify(state) : null;
  memoryRaw = null;
  try {
    if (raw) sessionStorage.setItem(STORAGE_KEY, raw);
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    memoryRaw = raw;
  }
  for (const listener of listeners) listener();
}

export function updateCheckoutState(update: Partial<CheckoutState>): void {
  write({ ...readCheckoutState(), ...update });
}

/** Starts a new checkout, keeping the contact details already typed. */
export function startCheckout(draft: CheckoutDraft): void {
  write({ ...EMPTY, contact: readCheckoutState().contact, draft });
}

/**
 * Opens the checkout session the backend started for an accepted proposal. It
 * belongs to the signed-in customer, so it uses their bearer token: no draft,
 * no checkout token. Everything else (totals, hold, booking, payment) is the
 * existing checkout's.
 */
export function continueProposalCheckout(sessionId: string, priceChanged: boolean): void {
  write({ ...EMPTY, sessionId, proposalPriceChanged: priceChanged });
}

export function clearCheckoutState(): void {
  write(null);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** React hook: the checkout state, `undefined` until it can be read in the browser. */
export function useCheckoutState(): CheckoutState | undefined {
  return useSyncExternalStore(subscribe, readCheckoutState, () => undefined);
}
