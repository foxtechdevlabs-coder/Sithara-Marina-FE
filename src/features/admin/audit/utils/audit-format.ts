import type { Route } from "next";

import { adminRoutes } from "@/constants/routes";
import { getBooking } from "@/services/admin/bookings.service";
import { getCustomer } from "@/services/admin/customers.service";
import { getYacht } from "@/services/admin/fleet.service";
import { getPartner } from "@/services/admin/partners.service";
import { getPayment } from "@/services/admin/payments.service";
import { getPayout } from "@/services/admin/payouts.service";

/* Wording of the audit history. */

const words = (value: string) => value.replace(/[_-]+/g, " ").trim();
const capital = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const VERBS: Record<string, string> = {
  create: "Created",
  created: "Created",
  update: "Updated",
  updated: "Updated",
  delete: "Deleted",
  deleted: "Deleted",
  remove: "Removed",
  activate: "Activated",
  deactivate: "Deactivated",
  approve: "Approved",
  reject: "Rejected",
  cancel: "Cancelled",
  reschedule: "Rescheduled",
  refund: "Refunded",
  retry: "Retried",
  record: "Recorded",
  publish: "Published",
  invite: "Invited",
  restore: "Restored",
  replace: "Replaced",
  reorder: "Reordered",
  attach: "Attached",
  override: "Overrode",
};

/** "yacht.update" → "Updated yacht"; "booking.price_override" → "Booking: price override". */
export function actionText(action: string): string {
  const parts = action.split(".").filter(Boolean);
  if (parts.length < 2) return capital(words(action));
  const verb = parts[parts.length - 1]!;
  const subject = words(parts.slice(0, -1).join(" "));
  if (VERBS[verb]) return `${VERBS[verb]} ${subject}`;
  return `${capital(subject)}: ${words(verb)}`;
}

/** "price_rule" → "Price rule" */
export const entityTypeText = (type: string) => capital(words(type));

/** "25 Oct · 14:20" in the marina's time zone (with the year when it isn't this year). */
export function whenText(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const tz = "Asia/Kolkata";
  const sameYear =
    d.toLocaleDateString("en-GB", { year: "numeric", timeZone: tz }) ===
    now.toLocaleDateString("en-GB", { year: "numeric", timeZone: tz });
  const day = d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
    timeZone: tz,
  });
  const time = d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: tz,
  });
  return `${day} · ${time}`;
}

export interface RecordRef {
  label: string;
  href?: Route;
}

/** Where a record of each type lives, and how to name it (one request, when there is a single-record endpoint). */
const RECORDS: Record<
  string,
  { href?: (id: string) => Route; name?: (id: string) => Promise<string> }
> = {
  yacht: { href: adminRoutes.fleetYacht, name: async (id) => (await getYacht(id)).name },
  booking: { href: adminRoutes.booking, name: async (id) => (await getBooking(id)).reference },
  partner: { href: adminRoutes.partner, name: async (id) => (await getPartner(id)).name },
  customer: { href: adminRoutes.customer, name: async (id) => (await getCustomer(id)).full_name },
  payout: { href: adminRoutes.payout, name: async (id) => (await getPayout(id)).reference },
  payment: {
    href: adminRoutes.refundPayment,
    name: async (id) => {
      const p = await getPayment(id);
      return p.provider_payment_id ?? p.reference ?? `Payment for ${p.booking.reference}`;
    },
  },
  availability_block: { href: adminRoutes.availabilityBlock },
  cancellation_request: { href: adminRoutes.cancellationRequest },
  price_rule_batch: { href: adminRoutes.priceBatch },
};

/** The record's link, without a request. */
export function recordHref(type: string, id: string): Route | undefined {
  return RECORDS[type]?.href?.(id);
}

/** A fallback label: "Price rule · 3f2a9c1e". */
export const shortRecord = (type: string, id: string) =>
  `${entityTypeText(type)} · ${id.slice(0, 8)}`;

const cache = new Map<string, Promise<string | null>>();

/**
 * The record's name ("Astra One", "SM-1050"), fetched once per record and
 * shared by every row; null when it can't be named (unknown type, removed
 * record or no permission).
 */
export function recordName(type: string, id: string): Promise<string | null> {
  const key = `${type}:${id}`;
  let found = cache.get(key);
  if (!found) {
    const name = RECORDS[type]?.name;
    found = name ? name(id).catch(() => null) : Promise.resolve(null);
    cache.set(key, found);
  }
  return found;
}

/** Fields not worth listing in a change. */
const QUIET = new Set(["updated_at", "created_at"]);

export interface FieldChange {
  field: string;
  before: unknown;
  after: unknown;
}

/** The fields that differ between before and after (all fields for a create or delete). */
export function changedFields(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): FieldChange[] {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  const out: FieldChange[] = [];
  for (const field of keys) {
    if (QUIET.has(field)) continue;
    const b = before?.[field];
    const a = after?.[field];
    if (JSON.stringify(b) !== JSON.stringify(a)) out.push({ field, before: b, after: a });
  }
  return out.sort((x, y) => x.field.localeCompare(y.field));
}

/** Paise fields: amounts, prices, totals and the yacht's hourly rate. */
const MONEY = /(^|_)(amount|price|payable|total)$|_amount$|^hourly_rate$/;

/** A value in a change, readable: "—", "Yes", "₹ 1,31,250 (13125000)", compact JSON. */
export function valueText(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number" && MONEY.test(field))
    return `₹ ${(value / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  if (typeof value === "string" || typeof value === "number") return String(value);
  const json = JSON.stringify(value);
  return json.length > 160 ? `${json.slice(0, 157)}…` : json;
}

export const fieldText = (field: string) => capital(words(field));
