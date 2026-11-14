import {
  formatAmount,
  formatLongDate,
  formatTimeRange,
  guests,
} from "@/features/user/account/utils/account-format";
import type { Enquiry, Proposal } from "@/services/user/enquiries.service";

/** "20 December 2026 · 16:00 · 10 guests · 4 hours". */
export function enquiryLine(enquiry: Enquiry): string {
  return [
    enquiry.preferred_date ? formatLongDate(enquiry.preferred_date) : null,
    enquiry.preferred_start_time,
    enquiry.guests ? guests(enquiry.guests) : null,
    enquiry.slot_type?.name,
    enquiry.destinations?.length ? enquiry.destinations.join(", ") : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export const PROPOSAL_STATUS_LABELS: Record<Proposal["status"], string> = {
  draft: "Being prepared",
  sent: "Awaiting your decision",
  accepted: "Accepted",
  rejected: "Declined",
  superseded: "Replaced by a newer proposal",
  expired: "Expired",
};

/** "20 December 2026 · 16:00–18:00 · 8 guests". */
export const proposalLine = (proposal: Proposal) =>
  `${formatLongDate(proposal.date)} · ${formatTimeRange(proposal.start_time, proposal.end_time)} · ${guests(proposal.guests)}`;

/** The proposal's total, or null until the GST rate is set. */
export const proposalTotal = (proposal: Proposal) =>
  proposal.pricing.total_amount === null
    ? null
    : formatAmount(proposal.pricing.total_amount, proposal.pricing.currency);
