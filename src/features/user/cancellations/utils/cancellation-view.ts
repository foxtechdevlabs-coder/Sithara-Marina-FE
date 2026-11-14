import type { BookingDetail } from "@/services/user/customer-bookings.service";

type RequestStatus = NonNullable<BookingDetail["cancellation_request"]>["status"];

/** The booking side of a cancellation request ("Booking cancelled"). */
export const CANCELLATION_STATUS_LABELS: Record<RequestStatus, string> = {
  pending: "Cancellation under review",
  approved: "Booking cancelled",
  rejected: "Cancellation declined",
};

/** Where the money stands, read from the booking's own refund records. */
export type RefundState = "none" | "decided" | "processing" | "completed" | "failed";

export const REFUND_STATUS_LABELS: Record<RefundState, string> = {
  none: "No refund due",
  decided: "Refund approved",
  processing: "Refund processing",
  completed: "Refund completed",
  failed: "Refund needs attention",
};

/**
 * The refund of a cancelled booking, or null when nothing is decided yet.
 * Every figure comes from GET /me/bookings/{ref}: `refunds`, `refunded_amount`,
 * `refund_pending_amount` and the decision in `cancellation`.
 */
export function refundState(booking: BookingDetail): RefundState | null {
  if (booking.refunds.some((refund) => refund.status === "failed")) return "failed";
  if (booking.refund_pending_amount > 0) return "processing";
  if (booking.refunded_amount > 0) return "completed";
  const decision = booking.cancellation?.refund_decision ?? null;
  if (decision === "none") return "none";
  if (decision) return "decided";
  return null;
}

/** Settled states are solid forest; anything still moving is pearl. */
export const refundTone = (state: RefundState) => (state === "completed" ? "forest" : "pearl");

/** The amount to show: given back, on its way, or decided. */
export function refundAmount(booking: BookingDetail): number | null {
  const moving = booking.refunded_amount + booking.refund_pending_amount;
  return moving > 0 ? moving : (booking.cancellation?.refund_amount ?? null);
}

/** "Original payment method" / "Returned by our office", from the refunds' channels. */
export function refundMethod(booking: BookingDetail): string | null {
  const channels = new Set(booking.refunds.map((refund) => refund.channel));
  if (channels.size === 0) return null;
  if (channels.size > 1) return "Original payment method and our office";
  return channels.has("gateway") ? "Original payment method" : "Returned by our office";
}
