import type { Cancellation } from "@/services/user/cancellations.service";

type Refund = NonNullable<Cancellation["refund"]>;

/** The booking side of a cancellation ("Booking cancelled"). */
export const CANCELLATION_STATUS_LABELS: Record<Cancellation["status"], string> = {
  requested: "Cancellation under review",
  approved: "Booking cancelled",
  declined: "Cancellation declined",
};

/** The refund, shown separately from the booking ("Refund processing"). */
export const REFUND_STATUS_LABELS: Record<Refund["status"], string> = {
  processing: "Refund processing",
  completed: "Refund completed",
  failed: "Refund needs attention",
};

/** Settled states are solid forest; anything still moving is pearl. */
export const refundTone = (refund: Refund) => (refund.status === "completed" ? "forest" : "pearl");
