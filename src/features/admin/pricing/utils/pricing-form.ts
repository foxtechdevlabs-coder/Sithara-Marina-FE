import { formatTime, parseTime } from "@/lib/time";
import type { SlotSetupInput } from "@/services/admin/fleet.service";
import type {
  PriceRule,
  PriceRuleInput,
  PriceRuleKind,
  PriceRulePatch,
} from "@/services/admin/pricing.service";

/* Money: the backend works in paise; the form shows rupees. ------------ */

/** ₹1 crore in paise, the backend's upper limit for an amount. */
export const MAX_AMOUNT_PAISE = 1_00_00_000_00;

/** "1,500.50" → 150050 paise; null when it isn't a valid rupee amount. */
export function rupeesToPaise(value: string): number | null {
  const clean = value.replace(/[,\s₹]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  const [whole, fraction = ""] = clean.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

/** 150050 paise → "1500.50" (for an input); whole rupees drop the decimals. */
export function paiseToRupees(paise: number): string {
  return paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2);
}

/** 150050 paise → "₹ 1,500.50" */
export function formatPaise(paise: number): string {
  return `₹ ${(paise / 100).toLocaleString("en-IN", {
    minimumFractionDigits: paise % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

/* Slot setup (mirrors the backend's slotSetupProblem) ------------------ */

/** Every charter starts at 5:00 AM or later and is back by 7:00 PM, the same day. */
export const FIRST_START = "05:00";
export const LAST_RETURN = "19:00";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
export const isTimeOfDay = (value: string) => TIME.test(value);
const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

export interface SlotTypeDraft {
  /** Existing slot type id; empty for a new one. */
  id: string;
  /** Stable React key. */
  key: string;
  name: string;
  duration: string;
  /** Comma-separated, as typed: "9:00 AM, 2:00 PM". */
  startTimes: string;
  active: boolean;
}

export interface SlotSetupDraft {
  opensAt: string;
  closesAt: string;
  turnaround: string;
  slotTypes: SlotTypeDraft[];
}

export const parseTimes = (value: string) => value.split(",").map(parseTime).filter(Boolean);

const intIn = (value: string, min: number, max: number) => {
  const n = Number(value);
  return value.trim() !== "" && Number.isInteger(n) && n >= min && n <= max;
};

/** The first problem with the slot setup, or null. */
export function slotSetupProblem(draft: SlotSetupDraft): string | null {
  if (!isTimeOfDay(draft.opensAt) || !isTimeOfDay(draft.closesAt))
    return "Choose the first departure and last return.";
  const opens = minutes(draft.opensAt);
  const closes = minutes(draft.closesAt);
  if (closes <= opens) return "The last return must be after the first departure (same day).";
  if (draft.opensAt < FIRST_START || draft.closesAt > LAST_RETURN)
    return "Charters must start at 5:00 AM or later and be back by 7:00 PM.";
  if (!intIn(draft.turnaround, 0, 720))
    return "Enter a turnaround of 0 to 720 minutes between charters.";
  if (draft.slotTypes.length > 20) return "A yacht can have at most 20 slot types.";

  const names = new Set<string>();
  for (const [index, type] of draft.slotTypes.entries()) {
    const label = type.name.trim() || `Slot type ${index + 1}`;
    if (!type.name.trim()) return `Give ${label} a name.`;
    if (type.name.trim().length > 50) return `"${label}" — use a name of 50 characters or fewer.`;
    const key = type.name.trim().toLowerCase();
    if (names.has(key)) return `The name "${label}" is used twice.`;
    names.add(key);
    if (!intIn(type.duration, 15, 1440))
      return `"${label}" — enter a duration of 15 to 1440 minutes.`;
    const times = parseTimes(type.startTimes);
    if (!times.length) return `"${label}" — add at least one start time.`;
    if (times.length > 48) return `"${label}" — use at most 48 start times.`;
    const bad = times.find((t) => !isTimeOfDay(t));
    if (bad) return `"${label}" — "${bad}" isn't a time. Use a time like 9:00 AM.`;
    if (new Set(times).size !== times.length) return `"${label}" lists a start time twice.`;
    for (const start of times) {
      if (minutes(start) < opens)
        return `"${label}" at ${formatTime(start)} starts before the first departure (${formatTime(draft.opensAt)}).`;
      if (minutes(start) + Number(type.duration) > closes)
        return `"${label}" at ${formatTime(start)} would end after the last return (${formatTime(draft.closesAt)}).`;
    }
  }
  return null;
}

/** PUT /admin/yachts/{id}/slot-types body, in the order shown. */
export function toSlotSetupInput(draft: SlotSetupDraft): SlotSetupInput {
  return {
    opens_at: draft.opensAt,
    closes_at: draft.closesAt,
    turnaround_minutes: Number(draft.turnaround),
    slot_types: draft.slotTypes.map((t) => ({
      ...(t.id ? { id: t.id } : {}),
      name: t.name.trim(),
      duration_minutes: Number(t.duration),
      start_times: parseTimes(t.startTimes),
      is_active: t.active,
    })),
  };
}

/* Price rules ------------------------------------------------------------ */

export interface PriceRuleDraft {
  slotTypeId: string;
  kind: PriceRuleKind;
  name: string;
  /** Rupees. */
  amount: string;
  includedGuests: string;
  /** Rupees per guest above the included guests. */
  extraGuestAmount: string;
  startsOn: string;
  endsOn: string;
  priority: string;
  active: boolean;
}

export const emptyRuleDraft = (slotTypeId: string): PriceRuleDraft => ({
  slotTypeId,
  kind: "base",
  name: "",
  amount: "",
  includedGuests: "",
  extraGuestAmount: "",
  startsOn: "",
  endsOn: "",
  priority: "0",
  active: true,
});

export const draftFromRule = (rule: PriceRule): PriceRuleDraft => ({
  slotTypeId: rule.slot_type_id,
  kind: rule.kind,
  name: rule.name ?? "",
  amount: paiseToRupees(rule.amount),
  includedGuests: rule.included_guests === null ? "" : String(rule.included_guests),
  extraGuestAmount: rule.extra_guest_amount === null ? "" : paiseToRupees(rule.extra_guest_amount),
  startsOn: rule.starts_on ?? "",
  endsOn: rule.ends_on ?? "",
  priority: String(rule.priority),
  active: rule.is_active,
});

/** Field errors keyed by input name, following the backend rules. */
export function validateRuleDraft(draft: PriceRuleDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!draft.slotTypeId) errors.slotTypeId = "Choose a slot type.";
  const amount = rupeesToPaise(draft.amount);
  if (draft.amount.trim() === "") errors.amount = "Enter the price of one charter.";
  else if (amount === null || amount > MAX_AMOUNT_PAISE)
    errors.amount = "Enter an amount in rupees (up to 2 decimals), at most ₹ 1 crore.";
  if (draft.includedGuests && !intIn(draft.includedGuests, 1, 1000))
    errors.includedGuests = "Enter a whole number from 1 to 1000.";
  if (draft.extraGuestAmount) {
    const extra = rupeesToPaise(draft.extraGuestAmount);
    if (extra === null || extra > MAX_AMOUNT_PAISE)
      errors.extraGuestAmount = "Enter an amount in rupees (up to 2 decimals).";
  }
  if (draft.name.trim().length > 100) errors.name = "Use 100 characters or fewer.";
  if (draft.kind === "season") {
    if (!draft.startsOn) errors.startsOn = "A season needs a first date.";
    if (!draft.endsOn) errors.endsOn = "A season needs a last date.";
  }
  if (draft.startsOn && draft.endsOn && draft.endsOn < draft.startsOn)
    errors.endsOn = "The last date can't be before the first date.";
  if (!intIn(draft.priority, -1000, 1000))
    errors.priority = "Enter a whole number from -1000 to 1000.";
  return errors;
}

/** POST /admin/yachts/{id}/price-rules body; optional fields only when filled in. */
export function toRuleInput(draft: PriceRuleDraft): PriceRuleInput {
  const input: PriceRuleInput = {
    slot_type_id: draft.slotTypeId,
    kind: draft.kind,
    amount: rupeesToPaise(draft.amount)!,
    priority: Number(draft.priority),
    is_active: draft.active,
  };
  if (draft.name.trim()) input.name = draft.name.trim();
  if (draft.includedGuests) input.included_guests = Number(draft.includedGuests);
  if (draft.extraGuestAmount) input.extra_guest_amount = rupeesToPaise(draft.extraGuestAmount)!;
  if (draft.startsOn) input.starts_on = draft.startsOn;
  if (draft.endsOn) input.ends_on = draft.endsOn;
  return input;
}

/** PATCH /admin/price-rules/{id} body: changed fields only; emptied optional fields → null. */
export function toRulePatch(draft: PriceRuleDraft, rule: PriceRule): PriceRulePatch {
  const next: Required<PriceRulePatch> = {
    kind: draft.kind,
    amount: rupeesToPaise(draft.amount)!,
    included_guests: draft.includedGuests ? Number(draft.includedGuests) : null,
    extra_guest_amount: draft.extraGuestAmount ? rupeesToPaise(draft.extraGuestAmount)! : null,
    name: draft.name.trim() || null,
    starts_on: draft.startsOn || null,
    ends_on: draft.endsOn || null,
    priority: Number(draft.priority),
    is_active: draft.active,
  };
  const patch: PriceRulePatch = {};
  for (const key of Object.keys(next) as (keyof PriceRulePatch)[]) {
    if (next[key] !== rule[key]) (patch as Record<string, unknown>)[key] = next[key];
  }
  return patch;
}
