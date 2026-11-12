import { fleetErrorMessage } from "@/features/admin/fleet/utils/fleet-error-message";
import { isApiError } from "@/services/http/api-error";

/* Wording of the enquiry and proposal screens. */

const words = (value: string) => value.replace(/[_-]+/g, " ").trim();
const capital = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const STAGE: Record<string, string> = {
  new: "New",
  in_progress: "Needs details",
  proposal_sent: "Proposal ready",
  accepted: "Converted",
  rejected: "Declined",
  closed: "Closed",
};
/** The enquiry's stage as the design words it. */
export const stageLabel = (status: string) => STAGE[status] ?? capital(words(status));

/** The stages staff can set by hand; the others follow the proposals. */
export const MANUAL_STAGES = ["new", "in_progress", "closed"] as const;

const PROPOSAL: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  rejected: "Declined by customer",
  superseded: "Replaced by a newer version",
  expired: "Expired",
};
export const proposalStatusLabel = (status: string) => PROPOSAL[status] ?? capital(words(status));

/** "2026-11-12" → "12 November" (with the year when it isn't `year`). */
export function dayText(date: string, withYear = false): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
}

/** The customer's choices from the website search, readable: "Type: Motor yacht". */
export function contextEntries(context: Record<string, unknown> | null | undefined): string[] {
  if (!context) return [];
  return Object.entries(context)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => {
      const value = Array.isArray(v)
        ? v.join(", ")
        : typeof v === "object"
          ? JSON.stringify(v)
          : String(v);
      return `${capital(words(k))}: ${value}`;
    });
}

/** History actions such as "proposal.send" → "Proposal sent". */
export function historyText(action: string): string {
  const MAP: Record<string, string> = {
    "enquiry.update": "Enquiry updated",
    "enquiry.assign": "Assignee changed",
    "proposal.create": "Proposal drafted",
    "proposal.update": "Proposal draft saved",
    "proposal.send": "Proposal sent",
    "proposal.publish": "Proposal sent",
    "proposal.revise": "Proposal revised into a new draft",
    "proposal.accept": "Customer accepted the proposal",
    "proposal.reject": "Customer declined the proposal",
  };
  if (MAP[action]) return MAP[action];
  const parts = action.split(".");
  return capital(words(parts.join(" ")));
}

/** "Comma, or one per line" → a clean list. */
export const parseList = (text: string) =>
  text
    .split(/\n|,|·/)
    .map((s) => s.trim())
    .filter(Boolean);

const EXPLAINED: Record<string, string> = {
  SLOT_DOUBLE_BOOKED: "That slot is already booked. Choose another date or time.",
  BUFFER_TIME_VIOLATION:
    "That time is too close to another charter (turnaround). Choose another time.",
  SLOT_NOT_AVAILABLE: "That slot isn’t available (outside charter hours, blocked or in the past).",
  PRICE_NOT_AVAILABLE:
    "This package has no price for that date yet. Set a price under Pricing & slots.",
  ENQUIRY_CLOSED: "This enquiry is closed. Reopen it (stage) before working on a proposal.",
  PROPOSAL_NOT_DRAFT: "This version was already sent. Revise it to make changes.",
  INVALID_SLOT_TYPE: "That package isn’t offered on this yacht.",
  INVALID_ADDON: "One of the add-ons isn’t offered on this yacht.",
  YACHT_NOT_FOUND: "That yacht isn’t available.",
  INVALID_ENQUIRY_UPDATE: "Choose an active staff member.",
};

/** A short message for a failed enquiry or proposal request. */
export function enquiryErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.code && EXPLAINED[error.code]) return EXPLAINED[error.code]!;
    if (error.status === 403) return "Your account doesn’t have access to enquiries.";
    if (error.status === 404) return "This enquiry or proposal no longer exists.";
  }
  return fleetErrorMessage(error, "This enquiry");
}
