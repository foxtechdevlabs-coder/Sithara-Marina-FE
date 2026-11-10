import { fleetErrorMessage } from "@/features/admin/fleet/utils/fleet-error-message";
import { formatTime } from "@/lib/time";
import { isApiError } from "@/services/http/api-error";
import type { BookingDetail, BookingSummary } from "@/services/admin/bookings.service";

/* Wording and number formats of the booking screens. */

export const MARINA_TIME_ZONE = "Asia/Kolkata";

const STATUS_LABEL: Record<string, string> = {
  pending_payment: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  no_show: "No show",
};

const titleCase = (value: string) => value.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

/** Booking column: "Confirmed", "Pending", … */
export const bookingStatusLabel = (status: string) => STATUS_LABEL[status] ?? titleCase(status);

const PAYMENT_LABEL: Record<string, string> = {
  not_started: "Not paid",
  pending: "Awaiting payment",
  processing: "Processing",
  succeeded: "Paid",
  failed: "Payment failed",
  cancelled: "Payment cancelled",
};

/**
 * Payment column. The list only carries the payment status, so "Offline paid"
 * and "Link sent" are shown on the booking record, where the payments are.
 */
export function paymentLabel(
  booking: Pick<BookingSummary, "payment_status" | "needs_review" | "status">,
) {
  if (booking.needs_review) return "Needs review";
  if (booking.status === "refunded") return "Refunded";
  return PAYMENT_LABEL[booking.payment_status] ?? titleCase(booking.payment_status);
}

/** The payment state with what the payments say: "Offline paid", "Link sent", … */
export function detailPaymentLabel(booking: BookingDetail) {
  if (booking.needs_review) return "Needs review";
  if (booking.status === "refunded") return "Refunded";
  const paid = booking.payments.find((p) => p.status === "succeeded");
  if (paid) return paid.method === "gateway" ? "Paid" : "Offline paid";
  if (booking.cancellation && booking.cancellation.refund_amount > 0) return "Refund pending";
  return paymentLabel(booking);
}

const METHOD_LABEL: Record<string, string> = {
  gateway: "Online (Razorpay)",
  cash: "Cash",
  bank_transfer: "Bank transfer",
};
export const paymentMethodLabel = (method: string) => METHOD_LABEL[method] ?? titleCase(method);

const PAYMENT_STATE_LABEL: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  succeeded: "Captured",
  failed: "Failed",
  cancelled: "Cancelled",
};
export const paymentStateLabel = (status: string) =>
  PAYMENT_STATE_LABEL[status] ?? titleCase(status);

const EXCEPTION_LABEL: Record<string, string> = {
  late_slot_taken: "Paid after the hold ended, and the slot was taken",
  late_departure_passed: "Paid after the departure time",
  duplicate_capture: "Paid twice",
  booking_not_payable: "Paid for a booking that could no longer be paid",
  amount_mismatch: "Paid a different amount",
};
export const exceptionLabel = (reason: string) => EXCEPTION_LABEL[reason] ?? titleCase(reason);

export const sourceLabel = (source: string) =>
  source === "office"
    ? "Office booking"
    : source === "online"
      ? "Online checkout"
      : titleCase(source);

const REFUND_LABEL: Record<string, string> = {
  full: "Full refund",
  partial: "Partial refund",
  none: "No refund",
};
export const refundDecisionLabel = (decision: string) =>
  REFUND_LABEL[decision] ?? titleCase(decision);

/** Paise → "₹ 1,31,250" (paise shown only when there are some). */
export function formatRupees(paise: number): string {
  const rupees = paise / 100;
  const digits = Number.isInteger(rupees) ? 0 : 2;
  return `₹ ${rupees.toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: 2 })}`;
}

/** "1,31,250" or "131250.50" typed by staff → paise; NaN when it isn't an amount. */
export function parseRupees(text: string): number {
  const cleaned = text.replace(/[₹,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return Number.NaN;
  return Math.round(Number(cleaned) * 100);
}

/** Paise → "131250" or "131250.5", for an amount input. */
export const rupeesInput = (paise: number) => String(paise / 100);

const parseDate = (date: string) => {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y!, (m ?? 1) - 1, d ?? 1));
};

/** "2026-11-12" → "12 Nov" */
export const shortDate = (date: string) =>
  parseDate(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

/** "2026-11-12" → "12 November 2026" */
export const longDate = (date: string) =>
  parseDate(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

/** "12 Nov · 09:00" */
export const departureText = (b: Pick<BookingSummary, "date" | "start_time">) =>
  `${shortDate(b.date)} · ${b.start_time}`;

/** "09:00–13:00" */
export const slotText = (b: { start_time: string; end_time: string }) =>
  `${b.start_time}–${b.end_time}`;

/** An instant in the marina's time zone: "25 October 2026, 5:30 PM". */
export function formatInstant(iso: string): string {
  const date = new Date(iso);
  const day = date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: MARINA_TIME_ZONE,
  });
  const time = date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: MARINA_TIME_ZONE,
  });
  return `${day}, ${formatTime(time)}`;
}

/** Today in the marina's time zone, "YYYY-MM-DD". */
export function marinaToday(now = new Date()): string {
  return now.toLocaleDateString("en-CA", { timeZone: MARINA_TIME_ZONE });
}

/** "4 hours", "90 minutes" from two "HH:mm" times. */
export function durationText(start: string, end: string): string {
  const minutes =
    Number(end.slice(0, 2)) * 60 +
    Number(end.slice(3, 5)) -
    (Number(start.slice(0, 2)) * 60 + Number(start.slice(3, 5)));
  if (minutes <= 0) return "";
  if (minutes % 60 === 0) return `${minutes / 60} ${minutes === 60 ? "hour" : "hours"}`;
  return `${minutes} minutes`;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** First and last day of a "YYYY-MM" month. */
export function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y!, m!, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${pad(last)}` };
}

/** "2026-11" moved by `delta` months. */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y!, m! - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

/** "2026-11" → "November 2026" */
export const monthLabel = (month: string) =>
  parseDate(`${month}-01`).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

/** "01–30 November 2026" */
export function monthRangeLabel(month: string): string {
  const { to } = monthRange(month);
  return `01–${to.slice(8)} ${monthLabel(month)}`;
}

/** Codes of the booking endpoints, worded for staff. */
const EXPLAINED: Record<string, string> = {
  BOOKING_NOT_FOUND: "This booking no longer exists.",
  BOOKING_NOT_EDITABLE: "This booking can't be changed any more in its current state.",
  SLOT_NOT_AVAILABLE: "That slot is no longer free. Choose another date or time.",
  PRICE_NOT_AVAILABLE: "That package has no price for this date, so it can't be booked yet.",
  PRICE_CHANGED: "The price changed since it was reviewed. Review the price again.",
  PRICE_WOULD_CHANGE:
    "This change would change the price. Cancel and rebook instead, or keep the current details.",
  GST_NOT_CONFIGURED: "GST isn't set up in Settings yet, so bookings can't be priced.",
  GUESTS_EXCEED_CAPACITY: "That's more guests than this yacht can take.",
  INVALID_SLOT_TYPE: "That package isn't offered on this yacht any more.",
  INVALID_ADDON: "One of the add-ons isn't offered on this yacht any more.",
  INVALID_CUSTOMER: "That customer can't be booked for. Choose an active customer.",
  YACHT_NOT_FOUND: "That yacht isn't available for booking (it may be inactive).",
  EMAIL_EXISTS: "A customer with this email already exists. Find them under existing customers.",
  PAYMENT_NOT_ALLOWED:
    "This booking can't take a payment: it isn't an unpaid office booking, or it's already paid.",
  PAYMENT_AMOUNT_MISMATCH:
    "The amount received must equal the booking total. Part payments aren't recorded.",
  PAYMENT_LINK_NOT_CONFIGURED:
    "Payment links aren't set up on the server yet (PAYMENT_LINK_URL). Record an offline payment instead.",
  INVALID_REFUND_AMOUNT: "A partial refund must be more than ₹ 0 and less than what was paid.",
  INVALID_STATUS_CHANGE:
    "Not yet: a booking can be completed after the charter ends, or marked no-show after it was due to start.",
  INVALID_DATE_RANGE: "The end date is before the start date.",
  REPORT_TOO_LARGE: "Too many bookings to export at once. Narrow the filters and try again.",
};

/** A short message for a failed booking request. */
export function bookingErrorMessage(error: unknown): string {
  const code = isApiError(error) ? error.code : undefined;
  if (code && EXPLAINED[code]) return EXPLAINED[code];
  return fleetErrorMessage(error, "This booking");
}
