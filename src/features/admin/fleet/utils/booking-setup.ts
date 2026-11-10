import {
  FIRST_START,
  LAST_RETURN,
  MAX_AMOUNT_PAISE,
  paiseToRupees,
  rupeesToPaise,
} from "@/features/admin/pricing/utils/pricing-form";
import type { SlotSetup, SlotSetupInput, SlotType } from "@/services/admin/fleet.service";
import type { PriceRule, PriceRuleInput } from "@/services/admin/pricing.service";

/**
 * Booking configuration on the add and edit yacht forms. The backend has no
 * fields for a minimum duration or for packages, so this is saved as its slot
 * setup: each package is a slot type with a base price rule, and nothing
 * shorter than the 1-hour slot exists, which is what sets the minimum.
 *
 * A package's switch is the slot type's `is_active`: on with a price means
 * guests can see and book it; off hides it and keeps its price. PUT …/slot-types
 * replaces the whole setup, so every saved package is always sent with its id:
 * one left out is deleted along with its prices.
 */

export { FIRST_START, LAST_RETURN };
export const MINIMUM_HOURS = 1;
/** Minimum gap between charters on a new yacht; change it on Slots & pricing. */
const TURNAROUND_MINUTES = 30;
const START_INTERVAL_MINUTES = 60;
/** Longest package: 5:00 AM to 7:00 PM. */
export const MAX_PACKAGE_HOURS = 14;

export const PACKAGES = [
  { hours: MINIMUM_HOURS, title: "1 hour", tag: "Minimum" },
  { hours: 2, title: "2 hours", tag: "Recommended" },
  { hours: 3, title: "3 hours", tag: "Recommended" },
] as const;

export interface PackageDraft {
  /** Stable id: the hours for the fixed packages, generated for custom ones. */
  key: string;
  /** The saved slot type, when there is one. */
  id?: string;
  /** The saved name; new packages are named from their hours. */
  name?: string;
  hours: number;
  /** Not one of the fixed packages. */
  custom?: boolean;
  enabled: boolean;
  /** Base price in rupees, excluding GST. */
  price: string;
}

export interface BookingSetupDraft {
  firstStart: string;
  /** When charters must be back. Each package's last start follows from it. */
  lastReturn: string;
  packages: PackageDraft[];
}

/** What the backend holds for a yacht: its slot setup and base price rules. */
export interface SavedBooking {
  setup: SlotSetup;
  rules: PriceRule[];
}

export const EMPTY_BOOKING_SETUP: BookingSetupDraft = {
  firstStart: FIRST_START,
  lastReturn: LAST_RETURN,
  packages: PACKAGES.map(({ hours }) => ({
    key: String(hours),
    hours,
    enabled: true,
    price: "",
  })),
};

const slotName = (hours: number) => `${hours}-hour`;
const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
const clock = (total: number) =>
  `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
const inDisplayOrder = (slots: SlotType[]) =>
  [...slots].sort((a, b) => a.sort_order - b.sort_order);

/** The base price of a slot type: its plain rule, preferring an active one. */
function baseRule(rules: PriceRule[], slotId: string | undefined) {
  return rules
    .filter(
      (r) =>
        r.slot_type_id === slotId &&
        r.kind === "base" &&
        r.amount !== null && // base rules are fixed prices
        !r.starts_on &&
        !r.ends_on,
    )
    .sort((a, b) => Number(b.is_active) - Number(a.is_active) || b.priority - a.priority)[0];
}

/**
 * The edit form's starting point, from a yacht's saved slots and prices. With an
 * hourly rate, a saved package with no price starts at rate × hours.
 */
export function draftFromSaved(
  { setup, rules }: SavedBooking,
  hourlyRate: number | null = null,
): BookingSetupDraft {
  const slots = inDisplayOrder(setup.slot_types);
  const toPackage = (slot: SlotType, key: string, custom?: boolean): PackageDraft => {
    const rule = baseRule(rules, slot.id);
    return {
      key,
      id: slot.id,
      name: slot.name,
      hours: slot.duration_minutes / 60,
      enabled: slot.is_active,
      price:
        rule?.amount != null
          ? paiseToRupees(rule.amount)
          : priceForHours(hourlyRate, slot.duration_minutes / 60),
      ...(custom ? { custom } : {}),
    };
  };
  const fixed = new Map<string, SlotType>();
  for (const { hours } of PACKAGES) {
    const slot = slots.find((s) => s.duration_minutes === hours * 60);
    if (slot) fixed.set(slot.id, slot);
  }
  return {
    firstStart: setup.opens_at ?? FIRST_START,
    lastReturn: setup.closes_at ?? LAST_RETURN,
    packages: [
      ...PACKAGES.map(({ hours }) => {
        const slot = [...fixed.values()].find((s) => s.duration_minutes === hours * 60);
        return slot
          ? toPackage(slot, String(hours))
          : { key: String(hours), hours, enabled: false, price: "" };
      }),
      ...slots.filter((s) => !fixed.has(s.id)).map((s) => toPackage(s, s.id, true)),
    ],
  };
}

/** Whole hours a custom package can use: not already taken by another package. */
export function customHourOptions(draft: BookingSetupDraft, own?: PackageDraft): number[] {
  const taken = new Set(draft.packages.filter((p) => p !== own).map((p) => p.hours));
  const options: number[] = [];
  for (let hours = 1; hours <= MAX_PACKAGE_HOURS; hours += 1) {
    if (!taken.has(hours)) options.push(hours);
  }
  return options;
}

/** Field id of a package's price input. */
export const packagePriceId = (key: string) => `package-${key}-price`;
/** Field id of a custom package's hours select. */
export const packageHoursId = (key: string) => `package-${key}-hours`;

/**
 * Packages to send: every saved one, plus new ones that are on or have a price.
 * A new package that is off and unpriced has nothing to keep.
 */
const toSend = (draft: BookingSetupDraft) =>
  draft.packages.filter((p) => p.id || p.enabled || p.price.trim());

const hoursChanged = (draft: BookingSetupDraft, saved?: SavedBooking) => {
  if (!saved) return true;
  const start = draftFromSaved(saved);
  return draft.firstStart !== start.firstStart || draft.lastReturn !== start.lastReturn;
};

/** Field errors keyed by input id. A saved yacht's unchanged hours aren't re-checked. */
export function bookingSetupErrors(
  draft: BookingSetupDraft,
  saved?: SavedBooking,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const changed = hoursChanged(draft, saved);
  if (changed) {
    if (!draft.firstStart || draft.firstStart < FIRST_START)
      errors["booking-first-start"] = "Charters can start from 5:00 AM.";
    if (!draft.lastReturn || draft.lastReturn > LAST_RETURN)
      errors["booking-last-return"] = "Charters must be back by 7:00 PM.";
    else if (draft.firstStart && draft.lastReturn <= draft.firstStart)
      errors["booking-last-return"] = "Must be after the first start time.";
  }

  for (const p of toSend(draft)) {
    const fits = !errors["booking-last-return"] && startTimes(draft, p.hours).length > 0;
    if ((changed || !p.id) && draft.firstStart && !fits && !errors["booking-last-return"]) {
      const message = `${p.name ?? `The ${p.hours}-hour package`} doesn't fit between these times.`;
      errors[p.custom && !p.id ? packageHoursId(p.key) : "booking-last-return"] = message;
    }
    if (!p.price.trim()) continue;
    const amount = rupeesToPaise(p.price);
    if (amount === null || amount > MAX_AMOUNT_PAISE)
      errors[packagePriceId(p.key)] =
        "Enter an amount in rupees (up to 2 decimals), at most ₹ 1 crore.";
  }
  return errors;
}

/**
 * Start times on the hourly grid: every start from which a charter of this
 * length is back by the last return (a 3-hour package's last start is 4:00 PM).
 */
export function startTimes(draft: BookingSetupDraft, hours = MINIMUM_HOURS): string[] {
  const closes = minutes(draft.lastReturn);
  const times: string[] = [];
  for (let t = minutes(draft.firstStart); t + hours * 60 <= closes; t += START_INTERVAL_MINUTES) {
    times.push(clock(t));
  }
  return times;
}

/**
 * PUT /admin/yachts/{id}/slot-types body. With `saved`, unchanged hours leave each saved package's own start times and
 * the display order alone, so slots set up on Slots & pricing aren't rewritten.
 */
export function toSlotSetup(draft: BookingSetupDraft, saved?: SavedBooking): SlotSetupInput {
  const keepHours = !hoursChanged(draft, saved);
  const savedSlots = saved ? inDisplayOrder(saved.setup.slot_types) : [];
  const order = (p: PackageDraft) => {
    const index = savedSlots.findIndex((s) => s.id === p.id);
    return index === -1 ? savedSlots.length + p.hours : index;
  };
  return {
    opens_at: draft.firstStart,
    closes_at: draft.lastReturn,
    turnaround_minutes: saved?.setup.turnaround_minutes ?? TURNAROUND_MINUTES,
    slot_types: toSend(draft)
      .sort((a, b) => order(a) - order(b))
      .map((p) => {
        const slot = savedSlots.find((s) => s.id === p.id);
        return {
          ...(p.id ? { id: p.id } : {}),
          name: p.name ?? slotName(p.hours),
          duration_minutes: Math.round(p.hours * 60),
          start_times: slot && keepHours ? slot.start_times : startTimes(draft, p.hours),
          is_active: p.enabled,
        };
      }),
  };
}

/** The saved setup, in the same shape as `toSlotSetup`. */
function savedInput({ setup }: SavedBooking) {
  return {
    opens_at: setup.opens_at,
    closes_at: setup.closes_at,
    turnaround_minutes: setup.turnaround_minutes,
    slot_types: inDisplayOrder(setup.slot_types).map((s) => ({
      id: s.id,
      name: s.name,
      duration_minutes: s.duration_minutes,
      start_times: s.start_times,
      is_active: s.is_active,
    })),
  };
}

/** The slot setup differs from what is saved, so it needs a PUT. */
export function isSetupChanged(draft: BookingSetupDraft, saved: SavedBooking): boolean {
  const next = toSlotSetup(draft, saved);
  const nothingSaved = saved.setup.opens_at === null && saved.setup.slot_types.length === 0;
  if (nothingSaved && next.slot_types.length === 0 && !hoursChanged(draft, saved)) return false;
  return JSON.stringify(next) !== JSON.stringify(savedInput(saved));
}

export type PriceChange =
  | { type: "create"; input: PriceRuleInput }
  | { type: "update"; ruleId: string; amount: number }
  | { type: "remove"; ruleId: string };

/**
 * The base-price changes needed, once `setup` holds every package's slot type.
 * Switched-off packages keep their prices.
 */
export function priceChanges(
  draft: BookingSetupDraft,
  setup: SlotSetup,
  rules: PriceRule[],
): PriceChange[] {
  return toSend(draft).flatMap((p): PriceChange[] => {
    const slot = setup.slot_types.find(
      (s) => s.id === p.id || (!p.id && s.name === slotName(p.hours)),
    );
    const rule = baseRule(rules, slot?.id ?? p.id);
    const amount = rupeesToPaise(p.price);
    if (amount) {
      if (!rule)
        return slot
          ? [{ type: "create", input: { slot_type_id: slot.id, kind: "base", amount } }]
          : [];
      return rule.amount === amount ? [] : [{ type: "update", ruleId: rule.id, amount }];
    }
    return rule && !p.price.trim() ? [{ type: "remove", ruleId: rule.id }] : [];
  });
}

/** Gives newly saved packages their ids, so a retry doesn't create them twice. */
export function withSavedIds(draft: BookingSetupDraft, setup: SlotSetup): BookingSetupDraft {
  return {
    ...draft,
    packages: draft.packages.map((p) => {
      if (p.id) return p;
      const slot = setup.slot_types.find((s) => s.name === slotName(p.hours));
      return slot ? { ...p, id: slot.id, name: slot.name } : p;
    }),
  };
}

/** A package's price from the hourly rate (paise): rate × hours, in rupees. */
export const priceForHours = (hourlyRate: number | null, hours: number) =>
  hourlyRate ? paiseToRupees(Math.round(hourlyRate * hours)) : "";

/** The price is empty or still rate × hours, so it follows the rate; a typed one doesn't. */
export const followsRate = (pkg: PackageDraft, hourlyRate: number | null) =>
  !pkg.price.trim() ||
  (hourlyRate !== null && rupeesToPaise(pkg.price) === Math.round(hourlyRate * pkg.hours));

/**
 * A package's switch. On fills an empty price from the rate. Off drops a worked-out
 * price from a package that isn't saved, since a price would create it; a typed
 * price stays, and a saved package keeps its price.
 */
export function packageSwitch(pkg: PackageDraft, enabled: boolean, hourlyRate: number | null) {
  if (enabled) return { enabled, price: pkg.price.trim() || priceForHours(hourlyRate, pkg.hours) };
  return { enabled, price: !pkg.id && followsRate(pkg, hourlyRate) ? "" : pkg.price };
}

/**
 * Re-prices packages after the hourly rate changes, leaving hand-set prices
 * alone. A package that is off and not saved stays empty: giving it a price
 * would create it. It picks up its price when it is switched on.
 */
export function repriceForRate(
  draft: BookingSetupDraft,
  previousRate: number | null,
  rate: number,
): BookingSetupDraft {
  return {
    ...draft,
    packages: draft.packages.map((p) =>
      (p.id || p.enabled) && followsRate(p, previousRate)
        ? { ...p, price: priceForHours(rate, p.hours) }
        : p,
    ),
  };
}

/** At least one package can be booked: it is on and has a price. */
export const hasPricedPackage = (draft: BookingSetupDraft) =>
  draft.packages.some((p) => p.enabled && Boolean(rupeesToPaise(p.price)));
