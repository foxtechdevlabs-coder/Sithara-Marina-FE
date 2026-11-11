import type { Tone } from "@/features/user/profile/components/account-ui";
import type {
  CancellationPreview,
  CancellationStatus,
  RefundDecision,
} from "@/services/user/cancellations.service";

/** Display words for the backend's cancellation values. Nothing here decides anything. */

export const REQUEST_STATUS: Record<CancellationStatus, { label: string; tone: Tone }> = {
  pending: { label: "Awaiting decision", tone: "waiting" },
  approved: { label: "Approved", tone: "positive" },
  rejected: { label: "Declined", tone: "negative" },
};

export const REFUND_DECISION: Record<RefundDecision, string> = {
  full: "Full refund",
  partial: "Partial refund",
  none: "No refund",
};

export const BLOCKED_REASON: Record<NonNullable<CancellationPreview["blocked_reason"]>, string> = {
  not_confirmed: "Only confirmed bookings can be cancelled, and this booking isn’t confirmed.",
  charter_started: "This charter has already started, so it can no longer be cancelled.",
  request_pending:
    "A cancellation request for this booking is already waiting for our team’s decision.",
};

export const REFUND_CHANNEL: Record<NonNullable<CancellationPreview["refund_channel"]>, string> = {
  gateway: "Back to the card, UPI or bank account you paid with",
  offline: "Handed back by our office",
};

/** 1440 → "1 day", 90 → "1 hour 30 minutes"; negative → started. */
export function formatLeadTime(minutes: number): string {
  if (minutes <= 0) return "The charter has started";
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = Math.round(minutes % 60);
  const part = (n: number, unit: string) => (n ? [`${n} ${unit}${n === 1 ? "" : "s"}`] : []);
  const parts = days ? [...part(days, "day"), ...part(hours, "hour")] : [...part(hours, "hour"), ...part(mins, "minute")];
  return `Departs in ${parts.join(" ") || "under a minute"}`;
}
