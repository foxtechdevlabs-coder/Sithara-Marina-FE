import { isApiError } from "@/services/http/api-error";
import { getBackendErrorDetails } from "@/services/http/backend-error";
import type { PaymentLinkSummary } from "@/services/user/payment-link.service";

/* Helpers for the customer's payment-link page (/pay#token=…). */

const STORAGE_KEY = "sm.payment-link.token";

/**
 * The link token: from `#token=…` (or `?token=…`), which is then removed from
 * the address bar so it isn't shared by copying the URL. It is kept for this
 * tab only, so a refresh still works.
 */
export function takePaymentLinkToken(): string | null {
  const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("token");
  const search = new URLSearchParams(window.location.search);
  const fromQuery = search.get("token");
  const token = fromHash || fromQuery;
  if (token) {
    try {
      sessionStorage.setItem(STORAGE_KEY, token);
    } catch {}
    search.delete("token");
    const rest = search.toString();
    window.history.replaceState(null, "", window.location.pathname + (rest ? `?${rest}` : ""));
    return token;
  }
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

const CODE_MESSAGES: Record<string, string> = {
  PAYMENT_LINK_NOT_FOUND:
    "This payment link isn’t valid any more. It may have expired or been replaced by a newer link. Please ask Sithara Marina for a new one.",
  BOOKING_NOT_FOUND:
    "We couldn’t find this booking. Please ask Sithara Marina for a new payment link.",
  HOLD_EXPIRED: "The time to pay for this booking has passed.",
  PAYMENT_NOT_ALLOWED: "This booking isn’t waiting for payment any more.",
  PAYMENT_PROVIDER_ERROR:
    "The payment service had a problem, so the payment wasn’t started. Please try again.",
  PAYMENT_NOT_CONFIGURED: "Online payment isn’t available right now. Please try again later.",
  PAYMENT_PROVIDER_UNAVAILABLE: "The payment service didn’t answer. Please try again.",
  INVALID_PAYMENT_SIGNATURE:
    "We couldn’t verify this payment. If you were charged, please contact Sithara Marina with your booking reference.",
};

/** "4 h 05 min" for long waits, "12:09" for the last hour. */
export function formatTimeLeft(seconds: number): string {
  if (seconds >= 3600) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h} h ${String(m).padStart(2, "0")} min`;
  }
  const m = Math.floor(seconds / 60);
  return `${m}:${String(seconds % 60).padStart(2, "0")}`;
}

export const errorCode = (error: unknown) => getBackendErrorDetails(error).code ?? null;

/** Customer text for a failed request. Raw server messages are never shown. */
export function paymentLinkErrorMessage(error: unknown, fallback: string): string {
  const code = errorCode(error);
  if (code && CODE_MESSAGES[code]) return CODE_MESSAGES[code];
  if (isApiError(error) && error.status === 404) return CODE_MESSAGES.PAYMENT_LINK_NOT_FOUND!;
  return fallback;
}

export const isLinkNotFound = (error: unknown) =>
  errorCode(error) === "PAYMENT_LINK_NOT_FOUND" || (isApiError(error) && error.status === 404);

const CLOSED_LABEL: Record<string, string> = {
  cancelled: "cancelled",
  refunded: "refunded",
  no_show: "closed",
};

/** What the page shows for a booking, from the backend's own fields. */
export type LinkState =
  | { kind: "payable" }
  | { kind: "paid" }
  | { kind: "processing" }
  | { kind: "closed"; label: string }
  | { kind: "expired" };

export function linkState(s: PaymentLinkSummary): LinkState {
  if (s.payment_status === "succeeded" || s.status === "confirmed" || s.status === "completed")
    return { kind: "paid" };
  if (CLOSED_LABEL[s.status]) return { kind: "closed", label: CLOSED_LABEL[s.status]! };
  // A payment in progress wins over "payable": paying again could charge twice.
  if (s.payment_status === "processing") return { kind: "processing" };
  if (s.payable) return { kind: "payable" };
  return { kind: "expired" };
}
