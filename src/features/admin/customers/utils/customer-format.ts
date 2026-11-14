import { fleetErrorMessage } from "@/features/admin/fleet/utils/fleet-error-message";
import { isApiError } from "@/services/http/api-error";

/* Wording, dates and phone checks of the customer screens. */

const MARINA_TIME_ZONE = "Asia/Kolkata";
const titleCase = (value: string) => value.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

const BOOKING_STATE: Record<string, string> = {
  pending_payment: "Payment pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  no_show: "No show",
};
/** A booking's state in the customer screens: "Payment pending", "Confirmed"… */
export const bookingStateLabel = (status: string) => BOOKING_STATE[status] ?? titleCase(status);

/** "Latest activity" in the list: "SM-1048 · Confirmed", "Payment pending", "Charter completed". */
export function latestActivityText(booking: { reference: string; status: string }): string {
  if (booking.status === "pending_payment") return `${booking.reference} · Payment pending`;
  if (booking.status === "completed") return `${booking.reference} · Charter completed`;
  return `${booking.reference} · ${bookingStateLabel(booking.status)}`;
}

const ENQUIRY_STATE: Record<string, string> = {
  new: "New enquiry",
  in_progress: "In progress",
  proposal_sent: "Proposal ready",
  accepted: "Accepted",
  rejected: "Declined",
  closed: "Closed",
};
export const enquiryStateLabel = (status: string) => ENQUIRY_STATE[status] ?? titleCase(status);

/** An instant's date in the marina's time zone: "12 November 2026". */
export const instantDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: MARINA_TIME_ZONE,
  });

/** "2026-11-12" → "12 November 2026" */
export const localDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

/**
 * A typed phone as E.164 ("+91 98765 43210" → "+919876543210"); "" for an
 * empty field, null when it isn't a valid international number.
 */
export function normalisePhone(value: string): string | null {
  const compact = value.replace(/[\s()-]/g, "");
  if (!compact) return "";
  return /^\+[1-9]\d{6,14}$/.test(compact) ? compact : null;
}

export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

/** Booking references look like SM-1048 or SM-2026-0042. */
export const looksLikeBookingReference = (value: string) => /^SM-\d/i.test(value.trim());

/** A short message for a failed customer request. */
export function customerErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.code === "EMAIL_EXISTS")
      return "An account already uses this email. Search for the customer instead.";
    if (error.status === 404) return "This customer no longer exists.";
    if (error.status === 403) return "Your account doesn’t have access to customers.";
  }
  return fleetErrorMessage(error, "This customer");
}
