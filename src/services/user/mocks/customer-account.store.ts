import {
  MOCK_BOOKINGS,
  MOCK_ENQUIRIES,
  MOCK_INVOICES,
  MOCK_NOTIFICATION_PREFERENCES,
  MOCK_PROFILE,
} from "./customer-account.mock";

/*
 * The mock customer account as one mutable record, so what a customer changes
 * (profile, preferences, a cancellation, a support message) shows on every
 * account page. It is kept in this tab's `sessionStorage`, like the customer
 * session, so a refresh keeps it and closing the tab resets it.
 *
 * MOCK ONLY. Delete this file once the account services call the backend.
 */

const STORAGE_KEY = "sithara-marina:mock-account:v1";

/** The mock team reviews a cancellation request this long after it was sent… */
export const MOCK_REVIEW_MS = 3_000;
/** …and the payment provider confirms the refund this long after approval. */
export const MOCK_REFUND_MS = 3_000;

export interface MockCancellation {
  booking_id: string;
  reference: string;
  reason: string;
  note: string | null;
  /** Epoch ms; drives the mock review and refund timing. */
  requested_at: number;
  status: "requested" | "approved" | "declined";
  refund: {
    reference: string;
    amount: number;
    method: string;
    status: "processing" | "completed" | "failed";
  } | null;
}

export interface MockSupportMessage {
  reference: string;
  booking_id: string | null;
  topic: string;
  message: string;
  sent_on: string;
}

type Bookings = typeof MOCK_BOOKINGS;

type Nullable<T> = { [K in keyof T]: T[K] | null };

export interface MockAccount {
  profile: Omit<typeof MOCK_PROFILE, "phone" | "country" | "photo_url" | "billing"> &
    Nullable<Pick<typeof MOCK_PROFILE, "phone" | "country">> & {
      photo_url: string | null;
      billing: Nullable<Record<keyof typeof MOCK_PROFILE.billing, string>>;
    };
  preferences: typeof MOCK_NOTIFICATION_PREFERENCES;
  bookings: (Omit<Bookings[number], "status"> & { status: string })[];
  invoices: typeof MOCK_INVOICES;
  enquiries: typeof MOCK_ENQUIRIES;
  cancellations: MockCancellation[];
  support_messages: MockSupportMessage[];
  /** A new email address waiting for its verification code. */
  pending_email: string | null;
}

const initial = (): MockAccount =>
  structuredClone({
    profile: MOCK_PROFILE,
    preferences: MOCK_NOTIFICATION_PREFERENCES,
    bookings: MOCK_BOOKINGS,
    invoices: MOCK_INVOICES,
    enquiries: MOCK_ENQUIRIES,
    cancellations: [],
    support_messages: [],
    pending_email: null,
  });

let account: MockAccount | null = null;

/** The current mock account (loaded from this tab's storage on first use). */
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

/** Applies `change` to the mock account and saves it for this tab. */
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
