import type {
  BookingStatus,
  BookingStatusResponse,
  PaymentStatus,
} from "@/services/user/booking.service";

/**
 * What a booking means to the customer. `status` is the booking and
 * `payment_status` its latest payment; only the backend sets either. A failed
 * payment leaves the booking `pending_payment`, so it can be paid again while
 * the hold lasts.
 */
export type BookingOutcome = "pending" | "confirmed" | "closed";

const OUTCOMES: Record<BookingStatus, BookingOutcome> = {
  pending_payment: "pending",
  confirmed: "confirmed",
  completed: "confirmed",
  cancelled: "closed",
  refunded: "closed",
  no_show: "closed",
};

export const bookingOutcome = (status: BookingStatus): BookingOutcome => OUTCOMES[status];

/** Where a payment stands, from the status endpoint. */
export type PaymentOutcome = "confirmed" | "closed" | "payment_failed" | "processing" | "unpaid";

export function paymentOutcome({ status, payment_status }: BookingStatusResponse): PaymentOutcome {
  const booking = bookingOutcome(status);
  if (booking !== "pending") return booking;
  if (payment_status === "failed" || payment_status === "cancelled") return "payment_failed";
  if (payment_status === "processing" || payment_status === "succeeded") return "processing";
  return "unpaid";
}

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending_payment: "Awaiting payment",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  no_show: "No show",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  not_started: "Not started",
  pending: "Awaiting payment",
  processing: "Processing",
  succeeded: "Paid",
  failed: "Failed",
  cancelled: "Cancelled",
};
