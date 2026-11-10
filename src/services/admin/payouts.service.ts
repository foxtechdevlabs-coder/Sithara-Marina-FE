import { z } from "zod";

import { adminApiClient } from "./admin-api-client";

/*
 * Partner payouts (backend: /admin/payouts, needs payouts:read / payouts:write).
 * A payout records a transfer already made to a partner for some of its
 * completed bookings; it doesn't move money. Amounts are paise.
 */

const partnerRef = z.object({ id: z.string(), name: z.string() });

/** Fields shared by summary lines and payout lines. `booking_status` is read as a string. */
const bookingLine = {
  booking_id: z.string(),
  reference: z.string(),
  yacht_id: z.string(),
  yacht_name: z.string(),
  starts_at: z.string(),
  /** Current status; a paid line that is no longer completed needs follow-up. */
  booking_status: z.string(),
  /** Booking total incl. GST. */
  gross_amount: z.number(),
  commission_rate: z.number().nullable(),
  commission_amount: z.number(),
  partner_payable: z.number(),
};

const summaryLineSchema = z.object({
  ...bookingLine,
  /** "paid" or "outstanding". */
  payout_status: z.string(),
  payout_id: z.string().nullable(),
  payment_reference: z.string().nullable(),
});
export type PayoutSummaryLine = z.infer<typeof summaryLineSchema>;

const summarySchema = z.object({
  partner: partnerRef,
  from: z.string(),
  to: z.string(),
  lines: z.array(summaryLineSchema),
  totals: z.object({
    gross_amount: z.number(),
    commission_amount: z.number(),
    partner_payable: z.number(),
    paid_amount: z.number(),
    outstanding_amount: z.number(),
  }),
});
export type PayoutSummary = z.infer<typeof summarySchema>;

export const payoutSchema = z.object({
  id: z.string(),
  partner: partnerRef,
  /** YYYY-MM-DD */
  paid_on: z.string(),
  reference: z.string(),
  amount: z.number(),
  currency: z.string(),
  notes: z.string().nullable(),
  recorded_by_id: z.string().nullable(),
  created_at: z.string(),
});
export type Payout = z.infer<typeof payoutSchema>;

export const payoutDetailSchema = payoutSchema.extend({
  lines: z.array(z.object(bookingLine)),
});
export type PayoutDetail = z.infer<typeof payoutDetailSchema>;

const payoutListSchema = z.object({
  items: z.array(payoutSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});
export type PayoutList = z.infer<typeof payoutListSchema>;

/** Query of GET /admin/payouts. `from` / `to` filter by paid date. */
export interface PayoutListQuery {
  page?: number;
  /** 1–100 (default 20). */
  limit?: number;
  partner_id?: string;
  /** Paid on or after, YYYY-MM-DD. */
  from?: string;
  /** Paid on or before, YYYY-MM-DD. */
  to?: string;
}

/** CreatePayoutDto */
export interface PayoutInput {
  partner_id: string;
  /** Completed bookings of this partner, not paid yet. */
  booking_ids: string[];
  /** YYYY-MM-DD */
  paid_on: string;
  /** The bank transfer's reference. */
  reference: string;
  /** Must equal the bookings' total partner payable. */
  amount: number;
  notes?: string;
}

/**
 * GET /admin/payouts/summary — a partner's statement: every booking with a
 * charter date in `from`–`to`, paid or outstanding, with totals.
 */
export function getPayoutSummary(
  partnerId: string,
  from: string,
  to: string,
  signal?: AbortSignal,
): Promise<PayoutSummary> {
  return adminApiClient.get("/admin/payouts/summary", {
    query: { partner_id: partnerId, from, to },
    schema: summarySchema,
    signal,
  });
}

/** GET /admin/payouts — recorded payouts, newest first. */
export function listPayouts(
  query: PayoutListQuery = {},
  signal?: AbortSignal,
): Promise<PayoutList> {
  return adminApiClient.get("/admin/payouts", {
    query: { ...query },
    schema: payoutListSchema,
    signal,
  });
}

/** GET /admin/payouts/{id} — a payout with its bookings. */
export function getPayout(id: string, signal?: AbortSignal): Promise<PayoutDetail> {
  return adminApiClient.get(`/admin/payouts/${encodeURIComponent(id)}`, {
    schema: payoutDetailSchema,
    signal,
  });
}

/**
 * POST /admin/payouts — records a transfer already made. 400 INVALID_PAYOUT,
 * 409 BOOKING_ALREADY_PAID (nothing is saved).
 */
export function recordPayout(input: PayoutInput): Promise<PayoutDetail> {
  return adminApiClient.post("/admin/payouts", { body: input, schema: payoutDetailSchema });
}
