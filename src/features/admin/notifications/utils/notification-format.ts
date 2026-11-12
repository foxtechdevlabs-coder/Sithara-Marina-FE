import type { Route } from "next";

import { adminRoutes } from "@/constants/routes";
import { fleetErrorMessage } from "@/features/admin/fleet/utils/fleet-error-message";
import { isApiError } from "@/services/http/api-error";

/* Wording of the notification screens. */

const words = (value: string) => value.replace(/[_-]+/g, " ").trim();
const capital = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const ALERT_TYPE: Record<string, string> = {
  booking_confirmed: "Booking confirmed",
  payment_needs_review: "Payment needs review",
  refund_failed: "Refund failed",
  refund_processed: "Refund processed",
  cancellation_requested: "Cancellation requested",
  enquiry_received: "New enquiry",
  proposal_accepted: "Proposal accepted",
  proposal_rejected: "Proposal declined",
  support_requested: "Support requested",
};
export const alertTypeLabel = (type: string) => ALERT_TYPE[type] ?? capital(words(type));

/** Severity colours, drawn from the admin palette's status tones. */
export const SEVERITY: Record<string, { label: string; color: string }> = {
  critical: { label: "Critical", color: "#b3261e" },
  warning: { label: "Needs attention", color: "#a86a12" },
  info: { label: "Information", color: "#2f6fb5" },
};
export const severityOf = (severity: string) => SEVERITY[severity] ?? SEVERITY.info!;

/** Where an alert leads: the booking, enquiry or cancellation request. */
export function alertHref(entityType: string | null, entityId: string | null): Route | null {
  if (!entityType || !entityId) return null;
  if (entityType === "booking") return adminRoutes.booking(entityId);
  if (entityType === "enquiry") return adminRoutes.enquiry(entityId);
  if (entityType === "cancellation_request") return adminRoutes.cancellationRequest(entityId);
  return null;
}

/** "Just now", "5 min ago", "3 h ago", "Yesterday", "12 Nov". */
export function timeAgo(iso: string, now: number): string {
  const ms = now - new Date(iso).getTime();
  const min = Math.floor(ms / 60_000);
  if (min < 1) return "Just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h ago`;
  if (h < 48) return "Yesterday";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });
}

const EMAIL_STATUS: Record<string, string> = {
  queued: "Queued",
  sending: "Sending",
  sent: "Sent",
  failed: "Failed",
};
export const emailStatusLabel = (status: string) => EMAIL_STATUS[status] ?? capital(words(status));

/** "booking_confirmed" → "Booking confirmed" (the template's own name is used when known). */
export const templateKeyLabel = (key: string) => capital(words(key));

/** A short message for a failed notifications request. */
export function notificationErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.code === "NOTIFICATION_NOT_FAILED") return "Only a failed email can be sent again.";
    if (error.code === "INVALID_TEMPLATE") return "The template has problems; see the list below.";
    if (error.status === 403) return "Your account doesn’t have permission for this.";
    if (error.status === 503)
      return "Live updates are unavailable right now; the list still works.";
  }
  return fleetErrorMessage(error, "This notification");
}

/** Fired after alerts are marked read anywhere, so the bell's count follows. */
export const ALERTS_CHANGED = "sm:alerts-changed";
export const announceAlertsChanged = () => window.dispatchEvent(new Event(ALERTS_CHANGED));
