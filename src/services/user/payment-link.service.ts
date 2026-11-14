import { z } from "zod";

import { apiClient } from "@/services/http/api-client";

/*
 * The customer's side of an admin-issued payment link (POST
 * /admin/bookings/{id}/payment-link emails `<PAYMENT_LINK_URL>#token=…`).
 * Whoever holds the link can pay, so every call sends the link token in
 * `X-Payment-Link-Token` and no account token (`auth: false`). The booking is
 * confirmed by the backend only: the browser's checkout result is verified
 * there, and Razorpay's webhook settles anything left open.
 */

const header = (token: string) => ({ "X-Payment-Link-Token": token });

/** PaymentLinkSummaryDto — amounts in paise. */
export const paymentLinkSummarySchema = z.object({
  booking_id: z.string(),
  reference: z.string(),
  /** pending_payment, confirmed, completed, cancelled, refunded, no_show */
  status: z.string(),
  /** not_started, pending, processing, succeeded, failed, cancelled */
  payment_status: z.string(),
  /** Waiting for payment, before its deadline, and not paid. Otherwise show the status. */
  payable: z.boolean(),
  /** The total while unpaid, 0 once paid. */
  amount_due: z.number(),
  yacht_name: z.string(),
  slot_type_name: z.string().nullable(),
  date: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  time_zone: z.string(),
  guest_count: z.number(),
  contact_name: z.string(),
  pricing: z.object({
    currency: z.string(),
    charter_amount: z.number().nullable(),
    addons: z.array(
      z.object({
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
  /** When the link stops working. */
  pay_by: z.string().nullable(),
});
export type PaymentLinkSummary = z.infer<typeof paymentLinkSummarySchema>;

/** PaymentCheckoutDto */
export const paymentCheckoutSchema = z.object({
  payment_id: z.string(),
  booking_id: z.string(),
  /** Which checkout to open, e.g. "razorpay". */
  provider: z.string(),
  status: z.string(),
  /** Paise: the booking's total. */
  amount: z.number(),
  currency: z.string(),
  hold_expires_at: z.unknown(),
  /** The provider's details for its checkout (Razorpay: key_id, order_id). */
  checkout: z.record(z.string(), z.unknown()),
});
export type PaymentCheckout = z.infer<typeof paymentCheckoutSchema>;

/** VerifyPaymentResponseDto */
export const verifyPaymentSchema = z.object({
  booking_id: z.string(),
  booking_status: z.string(),
  payment_status: z.string(),
  /** confirmed, already_done, processing, failed, needs_review */
  outcome: z.string(),
});
export type VerifyPaymentResult = z.infer<typeof verifyPaymentSchema>;

/** GET /pay — 404 PAYMENT_LINK_NOT_FOUND for a missing, unknown, revoked or expired link. */
export function getPaymentLink(token: string, signal?: AbortSignal) {
  return apiClient.get("/pay", {
    headers: header(token),
    auth: false,
    schema: paymentLinkSummarySchema,
    signal,
  });
}

/**
 * POST /bookings/{id}/payments — the Razorpay order (201), or the attempt
 * already open (200). 409 HOLD_EXPIRED / PAYMENT_NOT_ALLOWED; 502
 * PAYMENT_PROVIDER_ERROR; 503 PAYMENT_NOT_CONFIGURED / PAYMENT_PROVIDER_UNAVAILABLE
 * (safe to repeat: the backend looks for the order before creating another).
 */
export function startLinkPayment(bookingId: string, token: string) {
  return apiClient.post(`/bookings/${encodeURIComponent(bookingId)}/payments`, {
    headers: header(token),
    auth: false,
    schema: paymentCheckoutSchema,
    timeoutMs: 30_000,
  });
}

/**
 * POST /bookings/{id}/verify-payment — `payload` is exactly what the checkout
 * returned. 400 INVALID_PAYMENT_SIGNATURE.
 */
export function verifyLinkPayment(
  bookingId: string,
  token: string,
  payload: Record<string, unknown>,
) {
  return apiClient.post(`/bookings/${encodeURIComponent(bookingId)}/verify-payment`, {
    headers: header(token),
    auth: false,
    body: { payload },
    schema: verifyPaymentSchema,
    timeoutMs: 30_000,
  });
}
