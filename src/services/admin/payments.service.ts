import { z } from "zod";

import { adminApiClient } from "./admin-api-client";

/*
 * Admin payments and refunds (backend: /admin/payments, /admin/refunds,
 * POST /admin/bookings/{id}/refunds). Payments need payments:write; refunds
 * need refunds:read / refunds:write. Amounts are paise. Enum-like fields are
 * read as strings so a new backend value doesn't fail the page.
 */

const nullableString = z.string().nullable();

const paymentBookingSchema = z.object({
  id: z.string(),
  reference: z.string(),
  status: z.string(),
  customer_id: nullableString,
  contact_name: z.string(),
  contact_email: z.string(),
});

/** AdminPaymentDto */
export const adminPaymentSchema = z.object({
  id: z.string(),
  booking: paymentBookingSchema,
  amount: z.number(),
  currency: z.string(),
  /** pending, processing, succeeded, failed, cancelled */
  status: z.string(),
  /** gateway, cash, bank_transfer */
  method: z.string(),
  /** e.g. razorpay; `offline` for cash and bank transfer. */
  provider: z.string(),
  provider_order_id: nullableString,
  /** The gateway reference. */
  provider_payment_id: nullableString,
  /** Cash or bank transfer: the staff reference. */
  reference: nullableString,
  received_on: nullableString,
  captured_at: nullableString,
  instrument: nullableString,
  vpa: nullableString,
  bank: nullableString,
  wallet: nullableString,
  card_network: nullableString,
  card_last4: nullableString,
  failure_code: nullableString,
  failure_description: nullableString,
  /** Money taken that staff must resolve. */
  exception_reason: nullableString,
  /** Processed refunds. */
  refunded_amount: z.number(),
  /** Refunds still pending. */
  refund_pending_amount: z.number(),
  /** What can still be given back; 0 unless captured. */
  refundable_amount: z.number(),
  created_at: z.string(),
});
export type AdminPayment = z.infer<typeof adminPaymentSchema>;

const personSchema = z.object({ id: nullableString, name: z.string() });

/** RefundDto */
export const refundSchema = z.object({
  id: z.string(),
  booking: z.object({
    id: z.string(),
    reference: z.string(),
    status: z.string(),
    contact_name: z.string(),
  }),
  payment_id: z.string(),
  /** gateway: through the provider. offline: cash or bank transfer, handed back by staff. */
  channel: z.string(),
  amount: z.number(),
  currency: z.string(),
  /** pending, processed, failed */
  status: z.string(),
  reason: z.string(),
  approved_by: personSchema.nullable(),
  provider_refund_id: nullableString,
  /** Gateway: which try this is. */
  attempt: z.number(),
  reference: nullableString,
  refunded_on: nullableString,
  recorded_by: personSchema.nullable(),
  failure_code: nullableString,
  failure_description: nullableString,
  processed_at: nullableString,
  failed_at: nullableString,
  created_at: z.string(),
});
export type Refund = z.infer<typeof refundSchema>;

/** AdminPaymentDetailDto */
export const paymentDetailSchema = adminPaymentSchema.extend({
  /** Provider webhook events, oldest first. */
  events: z.array(
    z.object({ event_type: z.string(), result: z.string(), received_at: z.string() }),
  ),
  /** Oldest first. */
  refunds: z.array(refundSchema),
});
export type PaymentDetail = z.infer<typeof paymentDetailSchema>;

const page = <T extends z.ZodType>(item: T) =>
  z.object({ items: z.array(item), total: z.number(), page: z.number(), limit: z.number() });

/** Query of GET /admin/payments. */
export interface PaymentListQuery {
  page?: number;
  /** 1–100 (default 20). */
  limit?: number;
  status?: string;
  method?: "gateway" | "cash" | "bank_transfer";
  /** Only money taken that staff must resolve. */
  needs_review?: boolean;
  booking_id?: string;
  /** Booking reference, contact name or email, gateway or staff reference, or UPI address. */
  search?: string;
}

/** Query of GET /admin/refunds. */
export interface RefundListQuery {
  page?: number;
  limit?: number;
  status?: "pending" | "processed" | "failed";
  channel?: "gateway" | "offline";
  booking_id?: string;
  /** Booking reference, or contact name or email. */
  search?: string;
}

/** CreateRefundDto */
export interface RefundInput {
  /** Paise, a whole number, at most the payment's refundable amount. */
  amount: number;
  reason: string;
  /** The captured payment to refund; required when the booking has more than one. */
  payment_id?: string;
  /** Cash or bank transfer already handed back: recorded as processed now. */
  completed?: { refunded_on: string; reference?: string };
}

/** RecordRefundDto — the result of an offline refund. */
export interface RefundResult {
  status: "processed" | "failed";
  reference?: string;
  /** Required when processed. */
  refunded_on?: string;
  note?: string;
}

/** GET /admin/payments */
export function listPayments(query: PaymentListQuery = {}, signal?: AbortSignal) {
  return adminApiClient.get("/admin/payments", {
    query: { ...query },
    schema: page(adminPaymentSchema),
    signal,
  });
}

/** GET /admin/payments/{id} — with its webhook events and refunds. */
export function getPayment(id: string, signal?: AbortSignal): Promise<PaymentDetail> {
  return adminApiClient.get(`/admin/payments/${encodeURIComponent(id)}`, {
    schema: paymentDetailSchema,
    signal,
  });
}

/** GET /admin/refunds */
export function listRefunds(query: RefundListQuery = {}, signal?: AbortSignal) {
  return adminApiClient.get("/admin/refunds", {
    query: { ...query },
    schema: page(refundSchema),
    signal,
  });
}

/**
 * POST /admin/bookings/{id}/refunds. `idempotencyKey` (8–100 characters) makes
 * a repeated request answer with the same refund instead of a second one.
 */
export function createRefund(
  bookingId: string,
  input: RefundInput,
  idempotencyKey: string,
): Promise<Refund> {
  return adminApiClient.post(`/admin/bookings/${encodeURIComponent(bookingId)}/refunds`, {
    body: input,
    headers: { "Idempotency-Key": idempotencyKey },
    schema: refundSchema,
  });
}

/** PATCH /admin/refunds/{id} — records an offline refund as handed back, or failed. */
export function recordRefundResult(id: string, result: RefundResult): Promise<Refund> {
  return adminApiClient.patch(`/admin/refunds/${encodeURIComponent(id)}`, {
    body: result,
    schema: refundSchema,
  });
}

/** POST /admin/refunds/{id}/retry — tries a failed gateway refund again. */
export function retryRefund(id: string): Promise<Refund> {
  return adminApiClient.post(`/admin/refunds/${encodeURIComponent(id)}/retry`, {
    schema: refundSchema,
  });
}

/** A fresh key for one refund request: kept for retries of the same request. */
export function newIdempotencyKey(): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `refund-${random}`;
}
