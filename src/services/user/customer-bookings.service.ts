import { z } from "zod";

import { apiClient } from "@/services/http/api-client";

import { bookingStatusSchema } from "./booking.service";

/*
 * The signed-in customer's bookings (account area). Amounts are paise.
 * Account pages address a booking by its `reference` ("SM-2026-0001"), which
 * is the `{ref}` of every /me/bookings/{ref} endpoint.
 */

const paged = <T extends z.ZodType>(item: T) =>
  z.object({ items: z.array(item), total: z.number(), page: z.number(), limit: z.number() });

const yachtRefSchema = z.object({ id: z.string(), slug: z.string(), name: z.string() });

/** An item of GET /me/bookings. */
const bookingSummarySchema = z.object({
  id: z.string(),
  reference: z.string(),
  status: bookingStatusSchema,
  /** While `pending_payment`, the deadline for paying. */
  hold_expires_at: z.string().nullable(),
  yacht: yachtRefSchema,
  date: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  time_zone: z.string(),
  guest_count: z.number(),
  currency: z.string(),
  total_amount: z.number(),
});
export type BookingSummary = z.infer<typeof bookingSummarySchema>;

/** upcoming: soonest first, a charter in progress included. past: most recent first, cancelled, refunded and no-show included. */
export type BookingTimeframe = "upcoming" | "past";

/** The backend's largest page; an account rarely holds more bookings than this. */
const PAGE_LIMIT = 100;

/** GET /me/bookings?timeframe=… (first page of up to 100). */
export async function listMyBookings(
  timeframe: BookingTimeframe,
  signal?: AbortSignal,
): Promise<{ items: BookingSummary[]; total: number }> {
  const page = await apiClient.get("/me/bookings", {
    query: { timeframe, limit: PAGE_LIMIT },
    signal,
    schema: paged(bookingSummarySchema),
  });
  return { items: page.items, total: page.total };
}

const cancellationRequestStatusSchema = z.enum(["pending", "approved", "rejected"]);

/** GET /me/bookings/{ref}. */
const bookingDetailSchema = z.object({
  id: z.string(),
  reference: z.string(),
  status: bookingStatusSchema,
  hold_expires_at: z.string().nullable(),
  payment_status: z.enum([
    "not_started",
    "pending",
    "processing",
    "succeeded",
    "failed",
    "cancelled",
  ]),
  yacht: yachtRefSchema,
  slot: z.object({
    slot_type_name: z.string().nullable(),
    date: z.string(),
    start_time: z.string(),
    end_time: z.string(),
    time_zone: z.string(),
    starts_at: z.string(),
    ends_at: z.string(),
  }),
  guest_count: z.number(),
  contact: z.object({
    full_name: z.string(),
    email: z.string(),
    phone: z.string().nullable(),
  }),
  special_requests: z.string().nullable(),
  pricing: z.object({
    currency: z.string(),
    charter_amount: z.number().nullable(),
    addons: z.array(
      z.object({
        addon_id: z.string(),
        name: z.string(),
        quantity: z.number(),
        unit_price: z.number(),
        amount: z.number(),
      }),
    ),
    subtotal: z.number(),
    tax_rate: z.number().nullable(),
    tax_label: z.string(),
    tax_amount: z.number(),
    total_amount: z.number(),
  }),
  created_at: z.string(),
  payments: z.array(
    z.object({
      amount: z.number(),
      currency: z.string(),
      method: z.enum(["gateway", "cash", "bank_transfer"]),
      paid_at: z.string().nullable(),
      reference: z.string().nullable(),
    }),
  ),
  refunds: z.array(
    z.object({
      id: z.string(),
      amount: z.number(),
      currency: z.string(),
      /** pending: on its way back · processed: given back · failed: staff are looking at it. */
      status: z.enum(["pending", "processed", "failed"]),
      /** gateway: back to the card, UPI or bank used · offline: handed back by the office. */
      channel: z.enum(["gateway", "offline"]),
      requested_at: z.string(),
      processed_at: z.string().nullable(),
      /** Masked: only the last four characters are shown. */
      reference: z.string().nullable(),
    }),
  ),
  refunded_amount: z.number(),
  refund_pending_amount: z.number(),
  /** Null until the booking is confirmed. */
  invoice: z
    .object({
      status: z.enum(["pending_configuration", "pending_generation", "generated"]),
      invoice_number: z.string().nullable(),
    })
    .nullable(),
  cancellation: z
    .object({
      cancelled_at: z.string().nullable(),
      refund_decision: z.enum(["full", "partial", "none"]).nullable(),
      /** Paise; the refund decided, tracked in `refunds` as it goes back. */
      refund_amount: z.number().nullable(),
    })
    .nullable(),
  /** The latest cancellation request, if any. */
  cancellation_request: z
    .object({
      id: z.string(),
      status: cancellationRequestStatusSchema,
      reason: z.string().nullable(),
      requested_at: z.string(),
      decided_at: z.string().nullable(),
      decision_reason: z.string().nullable(),
    })
    .nullable(),
  /** Whether a request would be accepted now; the cancellation preview says why not. */
  can_request_cancellation: z.boolean(),
});
export type BookingDetail = z.infer<typeof bookingDetailSchema>;

/** 404 `BOOKING_NOT_FOUND`: unknown, another customer's, or an unpaid booking whose hold ended. */
export function getMyBooking(reference: string, signal?: AbortSignal): Promise<BookingDetail> {
  return apiClient.get(`/me/bookings/${encodeURIComponent(reference)}`, {
    signal,
    schema: bookingDetailSchema,
  });
}
