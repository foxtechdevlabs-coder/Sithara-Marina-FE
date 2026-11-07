import { z } from "zod";

import { apiClient } from "@/services/http/api-client";

import { credentialOptions } from "./checkout.service";

/*
 * Bookings. Contract: the backend's Swagger docs at
 * `<NEXT_PUBLIC_API_BASE_URL>/docs`. Each call needs exactly one credential:
 * see `credentialOptions()`. Amounts are paise.
 *
 * The deployed backend has no payment endpoints: `POST /bookings/{id}/payments`
 * and `POST /bookings/{id}/verify-payment` answer 404 and are not in Swagger,
 * so neither is called here.
 */

/** The hosted backend can take ~40 s to wake from idle (Render). */
const SLOW_START = { timeoutMs: 60_000 } as const;

const bookingPath = (id: string) => `/bookings/${encodeURIComponent(id)}`;

const bookingStatusSchema = z.enum([
  "pending_payment",
  "confirmed",
  "completed",
  "cancelled",
  "refunded",
  "no_show",
]);
export type BookingStatus = z.infer<typeof bookingStatusSchema>;

export interface CreateBookingRequest {
  checkout_session_id: string;
  terms_accepted: boolean;
  /** Paise: the `totals.total_amount` the customer accepted. Compared, never charged. */
  expected_total_amount: number;
}

const bookingCreatedSchema = z.object({
  id: z.string(),
  reference: z.string(),
  status: bookingStatusSchema,
  /** While `pending_payment`, the deadline for paying. */
  hold_expires_at: z.string().nullable(),
  remaining_seconds: z.number(),
  currency: z.string(),
  subtotal: z.number(),
  tax_amount: z.number(),
  total_amount: z.number(),
  created_at: z.string(),
});
export type BookingCreated = z.infer<typeof bookingCreatedSchema>;

/**
 * POST /bookings. 200 when this session's hold already has this booking, 201
 * for a new one, so a repeated request never creates a second booking. 400
 * `TERMS_NOT_ACCEPTED`, selection errors · 404 `CHECKOUT_SESSION_NOT_FOUND`,
 * `YACHT_NOT_FOUND` · 409 `HOLD_EXPIRED`, `PRICE_CHANGED`, `SLOT_NOT_AVAILABLE`,
 * `PRICE_NOT_AVAILABLE`, `GST_NOT_CONFIGURED` · 503 `SERVICE_UNAVAILABLE`.
 */
export function createBooking(
  request: CreateBookingRequest,
  checkoutToken: string | null,
): Promise<BookingCreated> {
  return apiClient.post("/bookings", {
    ...SLOW_START,
    ...credentialOptions(checkoutToken),
    body: request,
    schema: bookingCreatedSchema,
  });
}

const statusSchema = z.object({
  id: z.string(),
  reference: z.string(),
  status: bookingStatusSchema,
  hold_expires_at: z.string().nullable(),
});
export type BookingStatusResponse = z.infer<typeof statusSchema>;

/** GET /bookings/{id}/status. 404 `BOOKING_NOT_FOUND`. */
export function getBookingStatus(
  id: string,
  checkoutToken: string | null,
  signal?: AbortSignal,
): Promise<BookingStatusResponse> {
  return apiClient.get(`${bookingPath(id)}/status`, {
    ...credentialOptions(checkoutToken),
    signal,
    schema: statusSchema,
  });
}

const bookingSchema = z.object({
  id: z.string(),
  reference: z.string(),
  status: bookingStatusSchema,
  hold_expires_at: z.string().nullable(),
  yacht: z.object({ id: z.string(), slug: z.string(), name: z.string() }),
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
});
export type Booking = z.infer<typeof bookingSchema>;

/** GET /bookings/{id}. 404 `BOOKING_NOT_FOUND`, also for another customer's booking. */
export function getBooking(
  id: string,
  checkoutToken: string | null,
  signal?: AbortSignal,
): Promise<Booking> {
  return apiClient.get(bookingPath(id), {
    ...SLOW_START,
    ...credentialOptions(checkoutToken),
    signal,
    schema: bookingSchema,
  });
}
