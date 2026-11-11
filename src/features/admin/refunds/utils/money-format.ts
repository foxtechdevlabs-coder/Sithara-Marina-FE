import { fleetErrorMessage } from "@/features/admin/fleet/utils/fleet-error-message";
import { isApiError } from "@/services/http/api-error";
import type { AdminPayment, Refund } from "@/services/admin/payments.service";

/* Wording of the payments & refunds screens. */

const titleCase = (value: string) => value.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

const PAYMENT_STATUS: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  succeeded: "Captured",
  failed: "Failed",
  cancelled: "Cancelled",
};
const REFUND_STATUS: Record<string, string> = {
  pending: "Processing",
  processed: "Refunded",
  failed: "Failed",
};
const INSTRUMENT: Record<string, string> = {
  card: "Card",
  upi: "UPI",
  netbanking: "Net banking",
  wallet: "Wallet",
  emi: "EMI",
  paylater: "Pay later",
};
const EXCEPTION: Record<string, string> = {
  late_slot_taken: "Paid after the slot was taken",
  late_departure_passed: "Paid after the departure time",
  duplicate_capture: "Charged twice",
  booking_not_payable: "Booking couldn’t take a payment",
  amount_mismatch: "Amount doesn’t match the booking",
};

export const paymentStatusLabel = (status: string) => PAYMENT_STATUS[status] ?? titleCase(status);
export const refundStatusLabel = (status: string) => REFUND_STATUS[status] ?? titleCase(status);
export const exceptionLabel = (reason: string) => EXCEPTION[reason] ?? titleCase(reason);

/** "Online · UPI", "Bank transfer", "Cash". */
export function paymentMethodText(p: Pick<AdminPayment, "method" | "instrument">): string {
  if (p.method === "cash") return "Cash";
  if (p.method === "bank_transfer") return "Bank transfer";
  return p.instrument
    ? `Online · ${INSTRUMENT[p.instrument] ?? titleCase(p.instrument)}`
    : "Online";
}

/** The reference staff recognise: gateway id, staff reference, or a short id. */
export function paymentReference(
  p: Pick<AdminPayment, "id" | "provider_payment_id" | "reference">,
) {
  return p.provider_payment_id ?? p.reference ?? `PAY-${p.id.slice(0, 8).toUpperCase()}`;
}

export function refundReference(r: Pick<Refund, "id" | "provider_refund_id" | "reference">) {
  return r.provider_refund_id ?? r.reference ?? `REF-${r.id.slice(0, 8).toUpperCase()}`;
}

/** "Original method" for gateway refunds, "Cash / bank transfer" for offline ones. */
export const refundChannelText = (channel: string) =>
  channel === "gateway"
    ? "Original method"
    : channel === "offline"
      ? "Cash / bank transfer"
      : titleCase(channel);

/** How the instrument shows on the payment page, e.g. "Visa ···· 4242", "alex@okaxis". */
export function instrumentDetail(p: AdminPayment): string | null {
  if (p.card_last4) return `${p.card_network ?? "Card"} ···· ${p.card_last4}`;
  if (p.vpa) return p.vpa;
  if (p.wallet) return titleCase(p.wallet);
  if (p.bank) return p.bank;
  return null;
}

/** A short message for a failed payments / refunds request. */
export function moneyErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    switch (error.code) {
      case "INVALID_REFUND_AMOUNT":
        return "The amount must be more than ₹ 0 and no more than the refundable balance.";
      case "REFUND_NOT_ALLOWED":
        return "This payment can’t be refunded here (it isn’t captured, or the refund goes through the gateway).";
      case "IDEMPOTENCY_KEY_REUSED":
        return "This refund request was already sent with different details. Start the refund again.";
      case "REFUND_NOT_PENDING":
        return "This refund isn’t pending any more. Refresh to see its result.";
      case "REFUND_NOT_RETRYABLE":
        return "Only a failed gateway refund can be retried.";
      case "PAYMENT_NOT_FOUND":
        return "This payment no longer exists.";
      case "REFUND_NOT_FOUND":
        return "This refund no longer exists.";
      case "BOOKING_NOT_FOUND":
        return "This booking no longer exists.";
    }
    if (error.status === 403)
      return "Your account doesn’t have permission for payments and refunds.";
  }
  return fleetErrorMessage(error, "This payment");
}
