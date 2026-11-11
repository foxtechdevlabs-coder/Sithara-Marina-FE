import { z } from "zod";

import { getPublicEnv } from "@/config/env";
import { ApiError } from "@/services/http/api-error";
import { buildUrl } from "@/services/http/build-url";

import { adminApiClient } from "./admin-api-client";
import { refundSchema } from "./payments.service";
import { getAccessToken } from "./admin-session";

/*
 * Customer bookings for staff (backend: /admin/bookings/*). Reading needs
 * bookings:read; changes need bookings:write, and money actions payments:write.
 * Amounts are paise. Dates are local to the marina ("YYYY-MM-DD", "HH:mm").
 *
 * Enum-like fields are read as plain strings, so a new value from the backend
 * shows as text instead of failing the whole page.
 */

export const BOOKING_STATUSES = [
  "pending_payment",
  "confirmed",
  "completed",
  "cancelled",
  "refunded",
  "no_show",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

const nullableString = z.string().nullable();

const bookingYachtSchema = z.object({
  id: z.string(),
  /** As it read when booked. */
  name: z.string(),
  ownership: z.string(),
});

const bookingContactSchema = z.object({
  full_name: z.string(),
  email: z.string(),
  phone: nullableString,
});

const bookingCustomerSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  email: z.string(),
});

/** AdminBookingListItemDto */
export const bookingSummarySchema = z.object({
  id: z.string(),
  reference: z.string(),
  status: z.string(),
  source: z.string(),
  /** not_started | pending | processing | succeeded | failed | cancelled */
  payment_status: z.string(),
  /** Money was taken but the booking could not simply be confirmed. */
  needs_review: z.boolean(),
  yacht: bookingYachtSchema,
  /** Null for an unclaimed guest booking. */
  customer: bookingCustomerSchema.nullable(),
  contact: bookingContactSchema,
  date: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  time_zone: z.string(),
  starts_at: z.string(),
  ends_at: z.string(),
  guest_count: z.number(),
  currency: z.string(),
  /** Paise, including tax. */
  total_amount: z.number(),
  /** While pending_payment, the deadline for paying. */
  hold_expires_at: nullableString,
  created_at: z.string(),
});
export type BookingSummary = z.infer<typeof bookingSummarySchema>;

const bookingListSchema = z.object({
  items: z.array(bookingSummarySchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});
export type BookingList = z.infer<typeof bookingListSchema>;

/** BookingNoteDto */
export const bookingNoteSchema = z.object({
  id: z.string(),
  body: z.string(),
  author: z.object({ id: nullableString, name: z.string() }),
  created_at: z.string(),
});
export type BookingNote = z.infer<typeof bookingNoteSchema>;

/** AdminBookingPaymentDto */
export const bookingPaymentSchema = z.object({
  id: z.string(),
  provider: z.string(),
  status: z.string(),
  amount: z.number(),
  currency: z.string(),
  provider_order_id: nullableString,
  provider_payment_id: nullableString,
  captured_at: nullableString,
  failure_code: nullableString,
  failure_description: nullableString,
  /** Money taken but the booking not confirmed: staff decide. */
  exception_reason: nullableString,
  /** gateway | cash | bank_transfer */
  method: z.string(),
  reference: nullableString,
  received_on: nullableString,
  recorded_by_id: nullableString,
  created_at: z.string(),
});
export type BookingPayment = z.infer<typeof bookingPaymentSchema>;

const addonLineSchema = z.object({
  addon_id: z.string(),
  name: z.string(),
  quantity: z.number(),
  unit_price: z.number(),
  amount: z.number(),
});

/** AdminBookingDetailDto */
export const bookingDetailSchema = bookingSummarySchema.extend({
  slot_type_name: nullableString,
  partner: z.object({ id: z.string(), name: z.string() }).nullable(),
  special_requests: nullableString,
  terms_accepted_at: nullableString,
  slot_released_at: nullableString,
  pricing: z.object({
    currency: z.string(),
    charter_amount: z.number().nullable(),
    addons: z.array(addonLineSchema),
    subtotal: z.number(),
    tax_rate: z.number().nullable(),
    tax_label: z.string(),
    tax_amount: z.number(),
    total_amount: z.number(),
    price_rule: z.unknown().nullable(),
  }),
  commission: z.object({
    rate: z.number().nullable(),
    amount: z.number(),
    partner_payable: z.number(),
  }),
  /** Every attempt, newest first. */
  payments: z.array(bookingPaymentSchema),
  /** Every refund, oldest first (older backends left it out). */
  refunds: z.array(refundSchema).optional(),
  invoice: z
    .object({ id: z.string(), invoice_number: nullableString, status: z.string() })
    .nullable(),
  /** Newest first. */
  notes: z.array(bookingNoteSchema),
  cancellation: z
    .object({
      at: z.string(),
      by_id: nullableString,
      reason: z.string(),
      /** full | partial | none */
      refund_decision: z.string(),
      /** Paise to give back, as decided; the refunds work pays it. */
      refund_amount: z.number(),
    })
    .nullable(),
  closed_at: nullableString,
  price_override: z
    .object({
      at: z.string(),
      by_id: nullableString,
      reason: z.string(),
      original_total_amount: z.number(),
    })
    .nullable(),
  updated_at: z.string(),
});
export type BookingDetail = z.infer<typeof bookingDetailSchema>;

/** TimelineEventDto */
export const timelineEventSchema = z.object({
  at: z.string(),
  type: z.string(),
  /** Null for the customer or the system. */
  actor: z.object({ id: nullableString, name: z.string() }).nullable(),
  summary: z.string(),
  details: z.record(z.string(), z.unknown()).nullable(),
});
export type TimelineEvent = z.infer<typeof timelineEventSchema>;

const timelineSchema = z.object({
  items: z.array(timelineEventSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

/** PaymentLinkIssuedDto */
export const paymentLinkSchema = z.object({
  /** Also emailed to the contact. A secret: anyone with it can pay. */
  url: z.string(),
  /** When the link and the slot hold end (24 hours). */
  expires_at: z.string(),
  /** False: the email wasn't accepted; the link still works. */
  emailed: z.boolean(),
});
export type PaymentLink = z.infer<typeof paymentLinkSchema>;

/* Requests ----------------------------------------------------------- */

/** Query of GET /admin/bookings. `limit` is 1–100 (default 20). */
export interface BookingListQuery {
  page?: number;
  limit?: number;
  /** Reference, or contact name, email or phone. */
  search?: string;
  status?: BookingStatus;
  source?: "online" | "office";
  ownership?: "own" | "partner";
  yacht_id?: string;
  customer_id?: string;
  /** First charter date (inclusive). */
  from?: string;
  /** Last charter date (inclusive). */
  to?: string;
  /** Only bookings with money taken that staff must resolve. */
  needs_review?: boolean;
  sort?: "newest" | "charter_date" | "charter_date_desc";
}

export type OfficePaymentMethod = "cash" | "bank_transfer";

export interface OfficePayment {
  method: OfficePaymentMethod;
  /** Receipt number or transfer reference, ≤ 100 characters. */
  reference?: string;
  /** Local date the money arrived; never in the future. Today if left out. */
  received_on?: string;
}

/** CreateOfficeBookingDto — give `customer_id` or `customer`. */
export interface OfficeBookingInput {
  yacht_id: string;
  slot_type_id: string;
  date: string;
  start_time: string;
  guests: number;
  addons?: { addon_id: string; quantity: number }[];
  customer_id?: string;
  customer?: { full_name: string; email: string; phone?: string | null };
  special_requests?: string;
  /** The quoted total; a different one is 409 PRICE_CHANGED. */
  expected_total_amount: number;
  /** Money received now: confirmed at once. Left out: pending_payment for 24 hours. */
  payment?: OfficePayment;
}

/** UpdateAdminBookingDto */
export interface BookingPatch {
  contact_name?: string;
  contact_email?: string;
  /** E.164; null removes it. */
  contact_phone?: string | null;
  special_requests?: string | null;
  /** Within capacity, and only if the price stays the same (409 PRICE_WOULD_CHANGE). */
  guest_count?: number;
}

export interface CancelInput {
  reason: string;
  /** An unpaid booking can only be "none". */
  refund_decision: "full" | "partial" | "none";
  /** Paise, for partial only: more than 0 and less than what was paid. */
  refund_amount?: number;
}

export interface RescheduleInput {
  /** The booking's own package if left out. */
  slot_type_id?: string;
  date: string;
  start_time: string;
  reason?: string;
}

const path = (id: string) => `/admin/bookings/${encodeURIComponent(id)}`;

/* Bookings ----------------------------------------------------------- */

/** GET /admin/bookings */
export function listBookings(
  query: BookingListQuery = {},
  signal?: AbortSignal,
): Promise<BookingList> {
  return adminApiClient.get("/admin/bookings", {
    query: { ...query },
    schema: bookingListSchema,
    signal,
  });
}

/** GET /admin/bookings/{id} */
export function getBooking(id: string, signal?: AbortSignal): Promise<BookingDetail> {
  return adminApiClient.get(path(id), { schema: bookingDetailSchema, signal });
}

/**
 * POST /admin/bookings (201). 409 `SLOT_NOT_AVAILABLE`, `PRICE_CHANGED`,
 * `PRICE_NOT_AVAILABLE`, `GST_NOT_CONFIGURED`, `EMAIL_EXISTS`.
 */
export function createOfficeBooking(input: OfficeBookingInput): Promise<BookingDetail> {
  return adminApiClient.post("/admin/bookings", { body: input, schema: bookingDetailSchema });
}

/** PATCH /admin/bookings/{id} — send only what changed. */
export function updateBooking(id: string, patch: BookingPatch): Promise<BookingDetail> {
  return adminApiClient.patch(path(id), { body: patch, schema: bookingDetailSchema });
}

/** GET /admin/bookings/{id}/timeline — oldest first. */
export function getBookingTimeline(
  id: string,
  query: { page?: number; limit?: number } = {},
  signal?: AbortSignal,
) {
  return adminApiClient.get(`${path(id)}/timeline`, { query, schema: timelineSchema, signal });
}

/** POST /admin/bookings/{id}/notes (201) — staff-only note, ≤ 2000 characters. */
export function addBookingNote(id: string, body: string): Promise<BookingNote> {
  return adminApiClient.post(`${path(id)}/notes`, { body: { body }, schema: bookingNoteSchema });
}

/**
 * POST /admin/bookings/{id}/payment-link (201) — pending office bookings only.
 * 409 `PAYMENT_NOT_ALLOWED`, `SLOT_NOT_AVAILABLE` · 503 `PAYMENT_LINK_NOT_CONFIGURED`.
 */
export function issuePaymentLink(id: string): Promise<PaymentLink> {
  return adminApiClient.post(`${path(id)}/payment-link`, { schema: paymentLinkSchema });
}

/**
 * POST /admin/bookings/{id}/payments — cash or bank transfer for a pending
 * office booking. `amount` must equal the total (409 `PAYMENT_AMOUNT_MISMATCH`).
 */
export function recordOfficePayment(
  id: string,
  input: OfficePayment & { amount: number },
): Promise<BookingDetail> {
  return adminApiClient.post(`${path(id)}/payments`, { body: input, schema: bookingDetailSchema });
}

/** POST /admin/bookings/{id}/cancel — pending or confirmed bookings. */
export function cancelBooking(id: string, input: CancelInput): Promise<BookingDetail> {
  return adminApiClient.post(`${path(id)}/cancel`, { body: input, schema: bookingDetailSchema });
}

/**
 * POST /admin/bookings/{id}/reschedule. 409 `SLOT_NOT_AVAILABLE`,
 * `PRICE_NOT_AVAILABLE`, `PRICE_WOULD_CHANGE`, `BOOKING_NOT_EDITABLE`.
 */
export function rescheduleBooking(id: string, input: RescheduleInput): Promise<BookingDetail> {
  return adminApiClient.post(`${path(id)}/reschedule`, {
    body: input,
    schema: bookingDetailSchema,
  });
}

/**
 * POST /admin/bookings/{id}/price-override — super admin, unpaid office
 * bookings. `charter_amount` is paise before GST; add-ons keep their price.
 */
export function overrideBookingPrice(
  id: string,
  input: { charter_amount: number; reason: string },
): Promise<BookingDetail> {
  return adminApiClient.post(`${path(id)}/price-override`, {
    body: input,
    schema: bookingDetailSchema,
  });
}

/**
 * POST /admin/bookings/{id}/status — completed after the charter ended,
 * no_show after it was due to start. 409 `INVALID_STATUS_CHANGE`.
 */
export function changeBookingStatus(
  id: string,
  status: "completed" | "no_show",
): Promise<BookingDetail> {
  return adminApiClient.post(`${path(id)}/status`, {
    body: { status },
    schema: bookingDetailSchema,
  });
}

/* Office booking helpers --------------------------------------------- */

/** CustomerResponseDto (the fields the booking form uses). */
export const customerOptionSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  email: z.string(),
  phone: nullableString,
  is_active: z.boolean(),
});
export type CustomerOption = z.infer<typeof customerOptionSchema>;

/** GET /admin/customers?search=&status=active — needs customers:read. */
export async function searchCustomers(search: string, signal?: AbortSignal) {
  const list = await adminApiClient.get("/admin/customers", {
    query: { search, status: "active", limit: 8, sort: "name" },
    schema: z.object({ items: z.array(customerOptionSchema) }),
    signal,
  });
  return list.items;
}

/** AddonResponseDto */
export const addonOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: nullableString,
  /** Paise per unit, before GST. */
  price: z.number(),
  min_quantity: z.number(),
  max_quantity: z.number(),
});
export type AddonOption = z.infer<typeof addonOptionSchema>;

/** GET /admin/addons?yacht_id=&status=active — the yacht's own and global add-ons. */
export async function listYachtAddons(yachtId: string, signal?: AbortSignal) {
  const list = await adminApiClient.get("/admin/addons", {
    query: { yacht_id: yachtId, status: "active", limit: 100 },
    schema: z.object({ items: z.array(addonOptionSchema) }),
    signal,
  });
  return list.items;
}

/** CalendarWindowDto — a package start that can be booked now. */
const freeWindowSchema = z.object({
  date: z.string(),
  slot_type_id: z.string(),
  slot_type_name: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  /** Paise before GST. */
  price: z.number(),
});
export type FreeWindow = z.infer<typeof freeWindowSchema>;

const calendarSchema = z.object({
  timezone: z.string(),
  yachts: z.array(
    z.object({
      id: z.string(),
      bookings: z.array(
        z.object({
          id: z.string(),
          date: z.string(),
          start_time: z.string(),
          end_time: z.string(),
        }),
      ),
      blocks: z.array(z.object({ starts_at: z.string(), ends_at: z.string() })),
      free_windows: z.array(freeWindowSchema),
    }),
  ),
});
export type YachtCalendar = z.infer<typeof calendarSchema>["yachts"][number];

/**
 * GET /admin/calendar for one yacht, `from`–`to` (at most 42 days). Its free
 * windows are the starts a new booking can take. Needs bookings:read.
 */
export async function getYachtCalendar(
  yachtId: string,
  from: string,
  to: string,
  signal?: AbortSignal,
): Promise<YachtCalendar | null> {
  const calendar = await adminApiClient.get("/admin/calendar", {
    query: { yacht_id: yachtId, from, to, include_inactive: true },
    schema: calendarSchema,
    signal,
  });
  return calendar.yachts.find((y) => y.id === yachtId) ?? null;
}

/** QuoteDto (the fields the booking form shows). */
export const quoteSchema = z.object({
  slot: z.object({
    slot_type_id: z.string(),
    slot_type_name: z.string(),
    date: z.string(),
    start_time: z.string(),
    end_time: z.string(),
  }),
  guests: z.number(),
  currency: z.string(),
  charter_amount: z.number(),
  addons: z.array(addonLineSchema),
  addons_amount: z.number(),
  tax_label: z.string(),
  tax_rate: z.number(),
  tax_amount: z.number(),
  total_amount: z.number(),
});
export type Quote = z.infer<typeof quoteSchema>;

/**
 * POST /pricing/quote — the price an office booking will be created at;
 * also rechecks the slot (409 `SLOT_NOT_AVAILABLE`).
 */
export function quoteOfficeBooking(
  input: Pick<
    OfficeBookingInput,
    "yacht_id" | "slot_type_id" | "date" | "start_time" | "guests" | "addons"
  >,
  signal?: AbortSignal,
): Promise<Quote> {
  return adminApiClient.post("/pricing/quote", { body: input, schema: quoteSchema, signal });
}

/* Export ------------------------------------------------------------- */

/** Filters the bookings export takes (GET /admin/reports/bookings/export). */
export interface BookingExportQuery {
  from: string;
  to: string;
  yacht_id?: string;
  status?: BookingStatus;
  source?: "online" | "office";
}

/**
 * Downloads the bookings report as CSV (needs reports:read). The file comes
 * back as an attachment, so it is fetched directly rather than through the
 * JSON client. 400 `REPORT_TOO_LARGE` above 20 000 rows.
 */
export async function downloadBookingsCsv(query: BookingExportQuery): Promise<Blob> {
  const url = buildUrl(getPublicEnv().NEXT_PUBLIC_API_URL, "/admin/reports/bookings/export", {
    ...query,
    format: "csv",
  });
  const token = await getAccessToken();
  let response: Response;
  try {
    response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
  } catch (cause) {
    throw new ApiError("Network error while exporting bookings", { kind: "network", cause });
  }
  if (!response.ok) {
    const text = await response.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      /* keep the text */
    }
    throw new ApiError(`Request failed: export (${response.status})`, {
      kind: "http",
      status: response.status,
      body,
      headers: response.headers,
    });
  }
  return response.blob();
}
