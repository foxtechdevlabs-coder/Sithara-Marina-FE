import type { BookingStatus } from "@/services/user/booking.service";
import type { CustomerBooking } from "@/services/user/customer-bookings.service";
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

const ACTIVE: ReadonlySet<BookingStatus> = new Set(["pending_payment", "confirmed"]);

/** Still ahead: active and dated today or later (`today` is "YYYY-MM-DD"). */
export const isUpcoming = (booking: CustomerBooking, today: string) =>
  ACTIVE.has(booking.status) && booking.date >= today;

export interface BookingGroups {
  /** Soonest first. */
  upcoming: CustomerBooking[];
  /** Most recent first. */
  past: CustomerBooking[];
}

export function groupBookings(bookings: readonly CustomerBooking[], today: string): BookingGroups {
  const upcoming = bookings
    .filter((booking) => isUpcoming(booking, today))
    .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));
  const past = bookings
    .filter((booking) => !isUpcoming(booking, today))
    .sort((a, b) => b.date.localeCompare(a.date) || b.start_time.localeCompare(a.start_time));
  return { upcoming, past };
}

/** Enquiries still in progress (not yet booked or closed). */
export const openEnquiries = (enquiries: readonly Enquiry[]) =>
  enquiries.filter((enquiry) => enquiry.status !== "booked" && enquiry.status !== "closed");

export const ENQUIRY_STATUS_LABELS: Record<Enquiry["status"], string> = {
  received: "Received",
  in_review: "Being prepared",
  proposal_ready: "Proposal ready",
  booked: "Booked",
  closed: "Closed",
};
