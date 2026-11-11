import { z } from "zod";

import { apiClient } from "@/services/http/api-client";

import { credentialOptions } from "./checkout.service";

/*
 * Bookings. Contract: the backend's Swagger docs at
 * `<NEXT_PUBLIC_API_BASE_URL>/docs`. Each call needs exactly one credential:
 * see `credentialOptions()`. Amounts are paise.
 *
 * Payment, verification and invoice declare no credential in Swagger, but the
 * hosted backend checks them like the other booking endpoints: a bad
 * `X-Checkout-Token` is a 401 "Invalid checkout token". So they use the same rule.
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

const paymentStatusSchema = z.enum([
  "not_started",
  "pending",
  "processing",
  "succeeded",
  "failed",
  "cancelled",
]);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

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
  payment_status: paymentStatusSchema,
});
export type BookingStatusResponse = z.infer<typeof statusSchema>;

/**
 * GET /bookings/{id}/status. 404 `BOOKING_NOT_FOUND`. The backend sends a weak
 * ETag and no Cache-Control, so the browser would revalidate (304) and replay
 * its cached body; `no-store` makes every poll a fresh read.
 */
export function getBookingStatus(
  id: string,
  checkoutToken: string | null,
  signal?: AbortSignal,
): Promise<BookingStatusResponse> {
  return apiClient.get(`${bookingPath(id)}/status`, {
    ...credentialOptions(checkoutToken),
    init: { cache: "no-store" },
    signal,
    schema: statusSchema,
  });
}

const bookingSchema = z.object({
  id: z.string(),
  reference: z.string(),
  status: bookingStatusSchema,
  hold_expires_at: z.string().nullable(),
  payment_status: paymentStatusSchema,
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
    init: { cache: "no-store" },
    signal,
    schema: bookingSchema,
  });
}

// ── Payment ─────────────────────────────────────────────────────────────────

const paymentCheckoutSchema = z.object({
  payment_id: z.string(),
  booking_id: z.string(),
  /** Which checkout to open. Only "razorpay" is supported here. */
  provider: z.string(),
  status: z.enum(["pending", "processing", "succeeded", "failed", "cancelled"]),
  /** Paise. The booking's total, never the client's. */
  amount: z.number(),
  currency: z.string(),
  /** Swagger types it as an object; it is the paying deadline. Not relied on here. */
  hold_expires_at: z.unknown(),
  /** Public checkout details. Never a secret. */
  checkout: z.object({ key_id: z.string(), order_id: z.string() }),
});
export type PaymentCheckout = z.infer<typeof paymentCheckoutSchema>;

/** Error codes documented for the payment endpoints. */
export type PaymentErrorCode =
  | "HOLD_EXPIRED"
  | "PAYMENT_NOT_ALLOWED"
  | "PAYMENT_PROVIDER_ERROR"
  | "PAYMENT_NOT_CONFIGURED"
  | "PAYMENT_PROVIDER_UNAVAILABLE"
  | "INVALID_PAYMENT_SIGNATURE"
  | "INVOICE_NOT_AVAILABLE";

/**
 * POST /bookings/{id}/payments, with no body: the backend creates the order and
 * sets the amount. 200 returns the attempt already open, 201 a new one, so a
 * repeat never opens a second order. 409 `HOLD_EXPIRED`, `PAYMENT_NOT_ALLOWED` ·
 * 502 `PAYMENT_PROVIDER_ERROR` · 503 `PAYMENT_NOT_CONFIGURED`,
 * `PAYMENT_PROVIDER_UNAVAILABLE` (safe to repeat).
 */
export function startPayment(id: string, checkoutToken: string | null): Promise<PaymentCheckout> {
  return apiClient.post(`${bookingPath(id)}/payments`, {
    ...SLOW_START,
    ...credentialOptions(checkoutToken),
    schema: paymentCheckoutSchema,
  });
}

/** Exactly what Razorpay Checkout hands the browser after a payment. */
export interface RazorpayPaymentResult {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

const verifyPaymentSchema = z.object({
  booking_id: z.string(),
  booking_status: bookingStatusSchema,
  payment_status: z.enum(["pending", "processing", "succeeded", "failed", "cancelled"]),
  /**
   * `processing`: not known yet, so poll the status. `needs_review`: paid, but
   * staff must resolve the booking.
   */
  outcome: z.enum(["confirmed", "already_done", "processing", "failed", "needs_review"]),
});
export type VerifyPaymentResponse = z.infer<typeof verifyPaymentSchema>;

/**
 * POST /bookings/{id}/verify-payment. The backend checks the signature; the
 * browser's word is never proof of payment. 400 `INVALID_PAYMENT_SIGNATURE`.
 */
export function verifyPayment(
  id: string,
  payload: RazorpayPaymentResult,
  checkoutToken: string | null,
): Promise<VerifyPaymentResponse> {
  return apiClient.post(`${bookingPath(id)}/verify-payment`, {
    ...SLOW_START,
    ...credentialOptions(checkoutToken),
    body: { payload },
    schema: verifyPaymentSchema,
  });
}

// ── Invoice ─────────────────────────────────────────────────────────────────

const invoiceSchema = z.object({
  id: z.string(),
  booking_id: z.string(),
  invoice_number: z.string().nullable(),
  financial_year: z.string(),
  /** `generated`: download_url works. Otherwise it is still being prepared. */
  status: z.enum(["pending_configuration", "pending_generation", "generated"]),
  total_amount_paise: z.number(),
  /** A signed link to the PDF, valid for one hour. */
  download_url: z.string().nullable(),
  created_at: z.string(),
});
export type Invoice = z.infer<typeof invoiceSchema>;

/** GET /bookings/{id}/invoice. 404 `BOOKING_NOT_FOUND` · 409 `INVOICE_NOT_AVAILABLE` (not confirmed). */
export function getInvoice(
  id: string,
  checkoutToken: string | null,
  signal?: AbortSignal,
): Promise<Invoice> {
  return apiClient.get(`${bookingPath(id)}/invoice`, {
    ...SLOW_START,
    ...credentialOptions(checkoutToken),
    signal,
    schema: invoiceSchema,
  });
}
