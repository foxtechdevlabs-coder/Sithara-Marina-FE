import { fleetErrorMessage } from "@/features/admin/fleet/utils/fleet-error-message";
import type { EnquiryDetail, Proposal } from "@/services/admin/enquiries.service";
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

/** 330 → "5 h 30 min"; 240 → "4 h". */
export function durationText(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h ? `${h} h` : "", m ? `${m} min` : ""].filter(Boolean).join(" ") || "0 min";
}

/** The proposal's length: its package, or "Custom length · 5 h". */
export const proposalLengthText = (p: Pick<Proposal, "duration_minutes" | "slot_type_name">) =>
  p.duration_minutes !== null
    ? `Custom length · ${durationText(p.duration_minutes)}`
    : p.slot_type_name;

/**
 * What staff can do with a proposal version. Only a draft is edited and sent;
 * a sent, declined or expired version is revised into a new draft; an accepted
 * or replaced version is final. Nothing changes while the enquiry is closed.
 */
export function proposalActions(status: string, enquiryClosed: boolean) {
  return {
    edit: status === "draft" && !enquiryClosed,
    send: status === "draft" && !enquiryClosed,
    revise: ["sent", "rejected", "expired"].includes(status) && !enquiryClosed,
  };
}

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

type Context = Record<string, unknown> | null | undefined;

/** Readable names for the keys the website's enquiry form puts in `context`. */
const CONTEXT_LABEL: Record<string, string> = {
  flexible_dates: "Flexible on dates",
  adults: "Adults",
  children: "Children",
  contact_method: "Preferred contact",
  duration: "Requested duration",
  duration_minutes: "Requested duration",
  duration_hours: "Requested duration",
  hours: "Requested duration",
  min_length_ft: "Minimum length (ft)",
};
const CONTACT_METHOD: Record<string, string> = {
  whatsapp: "WhatsApp",
  email: "Email",
  phone: "Phone call",
  call: "Phone call",
};

/** One `context` value as text: booleans as Yes/No, lists joined, objects as "key: value". */
function contextValue(key: string, value: unknown): string {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (key === "duration_minutes" && typeof value === "number") return durationText(value);
  if ((key === "duration_hours" || key === "hours") && typeof value === "number")
    return durationText(Math.round(value * 60));
  if (key === "contact_method" && typeof value === "string")
    return CONTACT_METHOD[value.toLowerCase()] ?? capital(words(value));
  if (Array.isArray(value)) return value.map((v) => contextValue("", v)).join(", ");
  if (value && typeof value === "object")
    return Object.entries(value)
      .map(([k, v]) => `${capital(words(k))}: ${contextValue(k, v)}`)
      .join(" · ");
  return String(value);
}

const filled = (value: unknown) =>
  value !== null && value !== undefined && value !== "" && !(Array.isArray(value) && !value.length);

/** Every `context` entry the customer sent, labelled, in the order sent. */
export function contextRows(context: Context): [string, string][] {
  if (!context) return [];
  return Object.entries(context)
    .filter(([, v]) => filled(v))
    .map(([k, v]) => [CONTEXT_LABEL[k] ?? capital(words(k)), contextValue(k, v)]);
}

export interface EnquiryFacts {
  /** What the customer asked for: dates, duration, guests, yacht, places, budget, requirements. */
  request: [string, string][];
  /** How to reach them. */
  contact: [string, string][];
  /** The customer's budget or proposed amount, as typed; null when not given. */
  budget: string | null;
  /** The expected amount the customer typed, in paise (`context.expected_amount_paise`); null when not given. */
  expectedAmount: number | null;
  /** The charter length the customer asked for, in minutes (`context.duration_minutes`); null when not given. */
  requestedMinutes: number | null;
  /** How many days the customer wants the yacht for (`context.days`); null when not given. */
  days: number | null;
}

/** A positive whole number from `context`, or null (anything else is shown as sent, not used). */
const wholeNumber = (value: unknown) =>
  typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;

/** The customer's requested length and expected amount, from the enquiry's `context`. */
export function enquiryWishes(context: Record<string, unknown> | null | undefined) {
  return {
    requestedMinutes: wholeNumber(context?.duration_minutes),
    expectedAmount: wholeNumber(context?.expected_amount_paise),
    days: wholeNumber(context?.days),
  };
}

/** Paise → "₹ 1,50,000". */
const rupees = (paise: number) =>
  `₹ ${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/**
 * Everything the customer sent with an enquiry, as label / value rows, so no
 * field returned by GET /admin/enquiries/{id} is left out. Fields the customer
 * left empty are shown as "Not given" for the core request, and left out for
 * the extra `context` choices.
 */
export function enquiryFacts(e: Omit<EnquiryDetail, "proposals" | "history">): EnquiryFacts {
  const context = { ...(e.context ?? {}) };
  const take = (key: string) => {
    const value = context[key];
    delete context[key];
    return filled(value) ? value : undefined;
  };
  const flexible = take("flexible_dates");
  const adults = take("adults");
  const children = take("children");
  const contactMethod = take("contact_method");
  const { requestedMinutes, expectedAmount, days } = enquiryWishes(context);
  // Shown in their own rows below; any other (unexpected) value stays with the other choices.
  if (requestedMinutes !== null) delete context.duration_minutes;
  if (expectedAmount !== null) delete context.expected_amount_paise;
  if (days !== null) delete context.days;
  const party = [
    typeof adults === "number" ? `${adults} ${adults === 1 ? "adult" : "adults"}` : null,
    typeof children === "number" ? `${children} ${children === 1 ? "child" : "children"}` : null,
  ]
    .filter(Boolean)
    .join(", ");
  const none = "Not given";
  const request: [string, string][] = [
    [
      "Preferred date",
      (e.preferred_date ? dayText(e.preferred_date, true) : none) +
        (flexible === true ? " (flexible)" : flexible === false ? " (fixed)" : ""),
    ],
    ["Requested duration", requestedMinutes !== null ? durationText(requestedMinutes) : none],
    ["Number of days", days !== null ? `${days} ${days === 1 ? "day" : "days"}` : none],
    ["Guests", (e.guests ? `${e.guests}` : none) + (party ? ` (${party})` : "")],
    ["Yacht", e.yacht ? e.yacht.name : "Flexible: any yacht"],
    ["Destinations", e.destinations.length ? e.destinations.join(", ") : none],
    ["Occasion", e.occasion ?? none],
    ["Budget / proposed amount", e.budget ?? none],
    ["Expected amount", expectedAmount !== null ? rupees(expectedAmount) : none],
    ["Requirements and preferences", e.preferences ?? none],
    ["Message", e.message ?? none],
    ...contextRows(context),
  ];
  const contact: [string, string][] = [
    ["Name", e.contact.full_name],
    ["Email", e.contact.email || none],
    ["Phone", e.contact.phone || none],
    ...(contactMethod !== undefined
      ? ([["Preferred contact", contextValue("contact_method", contactMethod)]] as [
          string,
          string,
        ][])
      : []),
    ["Account", e.customer_id ? "Signed-in customer" : "Guest (no account)"],
  ];
  return { request, contact, budget: e.budget, expectedAmount, requestedMinutes, days };
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
  PROPOSAL_NOT_DRAFT:
    "This version was already sent, so it can’t change. Revise it into a new version instead.",
  INVALID_SLOT_TYPE: "That package isn’t offered on this yacht.",
  INVALID_ADDON: "One of the add-ons isn’t offered on this yacht.",
  YACHT_NOT_FOUND: "That yacht isn’t available.",
  INVALID_ENQUIRY_UPDATE: "Choose an active staff member.",
};

/**
 * A short message for a failed enquiry or proposal request. `customLength`: the
 * request set a custom length and price, which needs bookings:price_override.
 */
export function enquiryErrorMessage(error: unknown, customLength = false): string {
  if (isApiError(error)) {
    if (error.code && EXPLAINED[error.code]) return EXPLAINED[error.code]!;
    if (error.status === 403 && customLength)
      return "Your account can’t set a custom length and price (it needs the price override permission). Choose a package instead.";
    if (error.status === 403) return "Your account doesn’t have access to enquiries.";
    if (error.status === 404) return "This enquiry or proposal no longer exists.";
  }
  return fleetErrorMessage(error, "This enquiry");
}
