import { localParts, zonedIso } from "@/features/admin/availability/utils/availability-format";
import {
  MARINA_TIME_ZONE,
  parseRupees,
  rupeesInput,
} from "@/features/admin/bookings/utils/booking-format";
import type {
  EnquiryDetail,
  Proposal,
  ProposalInput,
  ProposalPatch,
} from "@/services/admin/enquiries.service";

import { enquiryWishes, parseList } from "./enquiry-format";

/* The proposal form: its fields, checks and request bodies (POST and PATCH). */

export const MESSAGE_MAX = 4000;
export const TERMS_MAX = 10000;
/** A custom length is at least an hour (CreateProposalDto.duration_minutes). */
export const MIN_CUSTOM_MINUTES = 60;
/** Whole hours a custom length can take in the form; the backend checks the return time. */
export const MAX_CUSTOM_HOURS = 24;
/** The backend's limit on how far ahead a proposal can stay open. */
const MAX_VALID_DAYS = 90;

export interface ProposalDraft {
  yachtId: string;
  yachtName: string;
  date: string;
  /**
   * "custom" for every new proposal: a length and price of its own (customers
   * ask for charters outside the yacht's packages). "package" only for a draft
   * or version that was made with a package: it stays a package unless a super
   * admin switches it to a custom length.
   */
  length: "package" | "custom";
  slotTypeId: string;
  /** Custom length, whole hours and minutes (0, 15, 30 or 45). */
  hours: string;
  minutes: string;
  /** Custom length: the whole charter, rupees excluding GST, as typed. */
  charter: string;
  startTime: string;
  guests: string;
  /** datetime-local in the marina's time zone; empty: 7 days after sending. */
  expires: string;
  inclusions: string;
  terms: string;
  message: string;
}

/** Minutes from "16:00" to "20:00" (past midnight wraps to the next day); null when unreadable. */
function minutesBetween(start: string, end: string): number | null {
  if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const diff = (eh! * 60 + em! - (sh! * 60 + sm!) + 1440) % 1440;
  return diff || null;
}

/**
 * The form for a saved draft, or a new proposal from the enquiry's wishes. A
 * draft made with a package stays a package (its length and price fields are
 * filled from its times and saved price, ready if it is switched to custom).
 */
export function proposalDraft(e: EnquiryDetail, p?: Proposal): ProposalDraft {
  if (p) {
    const isPackage = p.slot_type_id !== null && p.duration_minutes === null;
    const minutes = p.duration_minutes ?? minutesBetween(p.start_time, p.end_time);
    return {
      yachtId: p.yacht.id,
      yachtName: p.yacht.name,
      date: p.date,
      length: isPackage ? "package" : "custom",
      slotTypeId: isPackage ? p.slot_type_id! : "",
      hours: minutes !== null ? String(Math.floor(minutes / 60)) : "",
      minutes: minutes !== null ? String(minutes % 60) : "0",
      charter: rupeesInput(p.pricing.charter_amount),
      startTime: p.start_time,
      guests: String(p.guests),
      expires: p.expires_at
        ? (({ date, time }) => `${date}T${time}`)(localParts(p.expires_at, MARINA_TIME_ZONE))
        : "",
      inclusions: p.inclusions.join("\n"),
      terms: p.terms ?? "",
      message: p.message ?? "",
    };
  }
  // A new proposal starts from what the customer asked for: their yacht, date,
  // guests, requested length and expected amount (all editable).
  const { requestedMinutes, expectedAmount } = enquiryWishes(e.context);
  return {
    yachtId: e.yacht?.id ?? "",
    yachtName: e.yacht?.name ?? "",
    date: e.preferred_date ?? "",
    length: "custom",
    slotTypeId: "",
    hours: requestedMinutes !== null ? String(Math.floor(requestedMinutes / 60)) : "",
    minutes: requestedMinutes !== null ? String(requestedMinutes % 60) : "0",
    charter: expectedAmount !== null ? rupeesInput(expectedAmount) : "",
    startTime: "",
    guests: e.guests ? String(e.guests) : "",
    expires: "",
    inclusions: "",
    terms: "",
    message: "",
  };
}

/** The custom length in minutes, or NaN when it isn't a whole number of hours and minutes. */
export function customMinutes(d: ProposalDraft): number {
  if (!/^\d{1,2}$/.test(d.hours) || !/^\d{1,2}$/.test(d.minutes)) return Number.NaN;
  return Number(d.hours) * 60 + Number(d.minutes);
}

/** "16:00" + 330 → "21:30" (the next day wraps past midnight). */
export function returnTime(start: string, minutes: number): string | null {
  if (!/^\d{2}:\d{2}$/.test(start) || !Number.isFinite(minutes)) return null;
  const [h, m] = start.split(":").map(Number);
  const total = (h! * 60 + m! + minutes) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** A problem with the validity date-time (empty is fine: 7 days after sending). */
export function expiryProblem(expires: string, now: number): string | null {
  if (!expires) return null;
  const ms = new Date(
    zonedIso(expires.slice(0, 10), expires.slice(11, 16), MARINA_TIME_ZONE),
  ).getTime();
  if (!Number.isFinite(ms)) return "Enter a valid date and time.";
  if (ms <= now) return "Choose a time in the future.";
  if (ms > now + MAX_VALID_DAYS * 86_400_000) return `At most ${MAX_VALID_DAYS} days ahead.`;
  return null;
}

export interface ProposalCheckContext {
  /** Today in the marina's time zone (YYYY-MM-DD). */
  today: string;
  now: number;
  /** The chosen package is one the yacht offers. */
  packageFound: boolean;
  /** The yacht's packages are still loading. */
  packagesLoading: boolean;
  /** How many packages the yacht offers. */
  packageCount: number;
  /** The signed-in staff member may create or edit a custom length (super admins only). */
  canCustom: boolean;
  /** The yacht's operating hours ("HH:mm"), when set; a custom length must fit inside them. */
  hours?: { opens: string | null; closes: string | null };
}

const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h! * 60 + m!;
};

/** Field errors, keyed by field. Empty when the draft can be saved. */
export function proposalErrors(d: ProposalDraft, c: ProposalCheckContext): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!d.yachtId) errors.yacht = "Choose the yacht to propose.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) errors.date = "Choose the departure date.";
  else if (d.date < c.today) errors.date = "The date can’t be in the past.";
  if (d.length === "package") {
    if (!c.packageFound)
      errors.slot =
        !d.yachtId || c.packageCount || c.packagesLoading
          ? "Choose a package."
          : "This yacht has no packages yet: add one under Pricing & slots, or propose a custom length.";
  } else {
    if (!c.canCustom)
      errors.length = "Only a super admin can create or edit a custom-length proposal.";
    const minutes = customMinutes(d);
    if (!Number.isFinite(minutes) || minutes < MIN_CUSTOM_MINUTES)
      errors.hours = "Enter a length of at least 1 hour.";
    else if (minutes > MAX_CUSTOM_HOURS * 60) errors.hours = `At most ${MAX_CUSTOM_HOURS} hours.`;
    else if (/^\d{2}:\d{2}$/.test(d.startTime)) {
      // Within the yacht's operating hours (the backend also checks the charter hours).
      const { opens, closes } = c.hours ?? { opens: null, closes: null };
      const start = toMinutes(d.startTime);
      if (opens && start < toMinutes(opens))
        errors.start = `The yacht’s operating hours start at ${opens}.`;
      else if (closes && start + minutes > toMinutes(closes))
        errors.hours = `This would return at ${returnTime(d.startTime, minutes)}, after the yacht’s operating hours end (${closes}). Shorten it or start earlier.`;
    }
    const charter = parseRupees(d.charter);
    if (!d.charter.trim()) errors.charter = "Enter the charter price.";
    else if (!Number.isFinite(charter) || charter <= 0)
      errors.charter = "Enter an amount in rupees, e.g. 125000.";
  }
  if (!/^\d{2}:\d{2}$/.test(d.startTime)) errors.start = "Enter the start time.";
  const guests = Number(d.guests);
  if (!d.guests || !Number.isInteger(guests) || guests < 1)
    errors.guests = "Enter the number of guests.";
  const expiry = expiryProblem(d.expires, c.now);
  if (expiry) errors.expires = expiry;
  if (d.message.length > MESSAGE_MAX) errors.message = "Keep it to 4,000 characters.";
  if (d.terms.length > TERMS_MAX) errors.terms = "Keep it to 10,000 characters.";
  return errors;
}

const expiresAt = (d: ProposalDraft) =>
  d.expires ? zonedIso(d.expires.slice(0, 10), d.expires.slice(11, 16), MARINA_TIME_ZONE) : null;

const lengthOf = (d: ProposalDraft) =>
  d.length === "package"
    ? { slot_type_id: d.slotTypeId }
    : { duration_minutes: customMinutes(d), charter_amount: parseRupees(d.charter) };

/** POST /admin/enquiries/{id}/proposals body: empty text and validity are left out. */
export function proposalInput(d: ProposalDraft): ProposalInput {
  const expires = expiresAt(d);
  return {
    yacht_id: d.yachtId,
    ...lengthOf(d),
    date: d.date,
    start_time: d.startTime,
    guests: Number(d.guests),
    inclusions: parseList(d.inclusions),
    ...(d.message.trim() ? { message: d.message.trim() } : {}),
    ...(d.terms.trim() ? { terms: d.terms.trim() } : {}),
    ...(expires ? { expires_at: expires } : {}),
  };
}

/**
 * PATCH /admin/proposals/{id} body for the saved draft. A custom length sends
 * `duration_minutes` with `charter_amount`; a package draft sends no length at
 * all, so the backend keeps its package and prices it from the yacht's rates.
 * Cleared text and validity are sent as null. Add-ons aren't offered in the
 * form, so any already on the draft are kept.
 */
export function proposalPatch(d: ProposalDraft): ProposalPatch {
  const expires = expiresAt(d);
  return {
    yacht_id: d.yachtId,
    ...(d.length === "custom" ? lengthOf(d) : {}),
    date: d.date,
    start_time: d.startTime,
    guests: Number(d.guests),
    inclusions: parseList(d.inclusions),
    message: d.message.trim() || null,
    terms: d.terms.trim() || null,
    expires_at: expires,
  };
}
