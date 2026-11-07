import type { BookingStatus } from "@/services/user/booking.service";

/**
 * What a booking status means to the customer. The backend's only status field
 * is `status`: there is no `payment_status`, and no `failed` value. A payment
 * that did not go through can only leave the booking `pending_payment`.
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

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  pending_payment: "Awaiting payment",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  no_show: "No show",
};
