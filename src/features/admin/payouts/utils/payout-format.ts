import { fleetErrorMessage } from "@/features/admin/fleet/utils/fleet-error-message";
import { isApiError } from "@/services/http/api-error";
import type { PayoutSummary, PayoutSummaryLine } from "@/services/admin/payouts.service";

/* Statement wording and rules of the payout screens. */

/** A line can be paid out once its booking is completed and it isn't paid yet. */
export const isPayable = (line: PayoutSummaryLine) =>
  line.payout_status !== "paid" && line.booking_status === "completed";

const STATUS: Record<string, string> = {
  pending_payment: "awaiting payment",
  confirmed: "not completed yet",
  cancelled: "cancelled",
  refunded: "refunded",
  no_show: "no show",
};

/** The note under a line's reference: "Paid · NEFT-1", "Not completed yet"… */
export function lineNote(line: PayoutSummaryLine): string {
  if (line.payout_status === "paid") {
    const paid = `Paid${line.payment_reference ? ` · ${line.payment_reference}` : ""}`;
    return line.booking_status === "completed"
      ? paid
      : `${paid} · now ${STATUS[line.booking_status] ?? line.booking_status}, follow up`;
  }
  if (line.booking_status === "completed") return "Outstanding";
  const s = STATUS[line.booking_status] ?? line.booking_status.replace(/_/g, " ");
  return `${s.charAt(0).toUpperCase()}${s.slice(1)} · not payable`;
}

/** The statement's state: "Unpaid", "Partly paid", "Paid" or "Nothing to pay". */
export function statementStatus(summary: PayoutSummary): string {
  const payable = summary.lines.filter(isPayable).length;
  const paid = summary.lines.some((l) => l.payout_status === "paid");
  if (payable && paid) return "Partly paid";
  if (payable) return "Unpaid";
  if (paid) return "Paid";
  return "Nothing to pay";
}

/** "2026-11-25" → "25 November 2026" */
export const paidDateText = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

/** A short message for a failed payout request. */
export function payoutErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.code === "BOOKING_ALREADY_PAID")
      return "One of these bookings was paid out in the meantime. Nothing was saved; the statement has been refreshed.";
    if (error.code === "INVALID_PAYOUT")
      return "The statement changed: a booking is no longer completed or belongs to another partner, or the amount no longer matches. Nothing was saved; review the refreshed statement.";
    if (error.code === "INVALID_DATE_RANGE") return "The period’s end is before its start.";
    if (error.status === 403) return "Your account doesn’t have permission for payouts.";
    if (error.status === 404) return "This partner or payout no longer exists.";
  }
  return fleetErrorMessage(error, "This payout");
}
