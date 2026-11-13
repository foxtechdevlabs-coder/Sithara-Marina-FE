import type { BookingStatus } from "@/services/user/booking.service";
import type { BookingDetail } from "@/services/user/customer-bookings.service";
import type { Enquiry } from "@/services/user/enquiries.service";

/**
 * Status line under a booking ("Confirmed · Paid"). A booking only becomes
 * `confirmed` once paid, so "Paid" follows from the status itself.
 */
export const CUSTOMER_STATUS_LABELS: Record<BookingStatus, string> = {
  pending_payment: "Awaiting payment",
  confirmed: "Confirmed · Paid",
  completed: "Completed · Paid",
  cancelled: "Cancelled",
  refunded: "Cancelled · Refunded",
  no_show: "Not attended",
};

/** "Confirmed · Paid" → "Confirmed". */
export const shortStatus = (status: BookingStatus) =>
  CUSTOMER_STATUS_LABELS[status].split(" · ")[0];

export const isCancelled = (status: BookingStatus) =>
  status === "cancelled" || status === "refunded";

/** Still ahead: active, and the charter has not ended yet. */
export const isUpcomingBooking = (booking: BookingDetail, now = Date.now()) =>
  (booking.status === "confirmed" || booking.status === "pending_payment") &&
  Date.parse(booking.slot.ends_at) > now;

/** Enquiries still in progress (not yet decided or closed). */
export const openEnquiries = (enquiries: readonly Enquiry[]) =>
  enquiries.filter(
    (enquiry) =>
      enquiry.status === "new" ||
      enquiry.status === "in_progress" ||
      enquiry.status === "proposal_sent",
  );

export const ENQUIRY_STATUS_LABELS: Record<Enquiry["status"], string> = {
  new: "Received",
  in_progress: "Being prepared",
  proposal_sent: "Proposal ready",
  accepted: "Proposal accepted",
  rejected: "Proposal declined",
  closed: "Closed",
};
