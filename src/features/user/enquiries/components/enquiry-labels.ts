import type { Tone } from "@/features/user/profile/components/account-ui";
import type { EnquiryStatus, ProposalStatus } from "@/services/user/enquiries.service";

/** Display words for the backend's enquiry and proposal statuses. */

export const ENQUIRY_STATUS: Record<EnquiryStatus, { label: string; tone: Tone }> = {
  new: { label: "Received", tone: "waiting" },
  in_progress: { label: "In progress", tone: "waiting" },
  proposal_sent: { label: "Proposal sent", tone: "positive" },
  accepted: { label: "Accepted", tone: "positive" },
  rejected: { label: "Declined", tone: "negative" },
  closed: { label: "Closed", tone: "neutral" },
};

export const PROPOSAL_STATUS: Record<ProposalStatus, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "neutral" },
  sent: { label: "Awaiting your answer", tone: "waiting" },
  accepted: { label: "Accepted", tone: "positive" },
  rejected: { label: "Declined", tone: "negative" },
  superseded: { label: "Replaced by a newer version", tone: "neutral" },
  expired: { label: "Expired", tone: "neutral" },
};
