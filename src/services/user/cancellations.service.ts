import { z } from "zod";

import { apiClient } from "@/services/http/api-client";

/*
 * Customer cancellations. Contract: the backend's Swagger docs at
 * `<NEXT_PUBLIC_API_BASE_URL>/docs`. Every call needs the signed-in customer's
 * bearer token, which the shared client attaches (and renews on a 401).
 * Amounts are paise. Eligibility and refunds are the backend's decision.
 */

/** The hosted backend can take ~40 s to wake from idle (Render). */
const SLOW_START = { timeoutMs: 60_000 } as const;

/** `CreateCancellationRequestDto.reason` maxLength in Swagger. */
export const CANCELLATION_REASON_MAX_LENGTH = 1000;

const bookingRef = (ref: string) => `/me/bookings/${encodeURIComponent(ref)}`;

const bookingStatusSchema = z.enum([
  "pending_payment",
  "confirmed",
  "completed",
  "cancelled",
  "refunded",
  "no_show",
]);

export const cancellationStatusSchema = z.enum(["pending", "approved", "rejected"]);
export type CancellationStatus = z.infer<typeof cancellationStatusSchema>;

const refundDecisionSchema = z.enum(["full", "partial", "none"]);
export type RefundDecision = z.infer<typeof refundDecisionSchema>;

/** Error codes documented for these endpoints. */
export type CancellationErrorCode =
  | "BOOKING_NOT_FOUND"
  | "CANCELLATION_NOT_ALLOWED"
  | "CANCELLATION_REQUEST_EXISTS";

// ── Preview ─────────────────────────────────────────────────────────────────

const previewSchema = z.object({
  booking_reference: z.string(),
  /** Whether a request would be accepted now. */
  can_request: z.boolean(),
  blocked_reason: z.enum(["not_confirmed", "charter_started", "request_pending"]).nullable(),
  paid_amount: z.number(),
  refunded_amount: z.number(),
  refund_pending_amount: z.number(),
  /** The most that could still be given back. */
  refundable_amount: z.number(),
  /** Null when nothing was paid. */
  refund_channel: z.enum(["gateway", "offline"]).nullable(),
  currency: z.string(),
  /** Negative once the charter has begun. */
  minutes_before_departure: z.number(),
  cancellation_summary: z.string().nullable(),
  /** What the policy would refund. Null while staff decide refunds. */
  policy_refund: z.number().nullable(),
});
export type CancellationPreview = z.infer<typeof previewSchema>;

/** GET /me/bookings/{ref}/cancellation-preview. 404 `BOOKING_NOT_FOUND`. */
export function getCancellationPreview(
  ref: string,
  signal?: AbortSignal,
): Promise<CancellationPreview> {
  return apiClient.get(`${bookingRef(ref)}/cancellation-preview`, {
    ...SLOW_START,
    signal,
    schema: previewSchema,
  });
}

// ── Requests ────────────────────────────────────────────────────────────────

const requestSchema = z.object({
  id: z.string(),
  booking_reference: z.string(),
  booking: z.object({
    reference: z.string(),
    status: bookingStatusSchema,
    yacht_name: z.string(),
    date: z.string().nullable(),
    start_time: z.string().nullable(),
    end_time: z.string().nullable(),
    starts_at: z.string(),
  }),
  status: cancellationStatusSchema,
  reason: z.string().nullable(),
  requested_at: z.string(),
  decided_at: z.string().nullable(),
  /** What staff wrote when deciding. */
  decision_reason: z.string().nullable(),
  refund_decision: refundDecisionSchema.nullable(),
  /** Paise; the refund decided. */
  refund_amount: z.number().nullable(),
  currency: z.string(),
});
export type CancellationRequest = z.infer<typeof requestSchema>;

export interface SubmitCancellationRequest {
  reason: string;
}

/**
 * POST /me/bookings/{ref}/cancellation-requests. 400 blank or too long ·
 * 404 `BOOKING_NOT_FOUND` · 409 `CANCELLATION_NOT_ALLOWED`,
 * `CANCELLATION_REQUEST_EXISTS`. A request is not a cancellation: staff decide.
 */
export function submitCancellationRequest(
  ref: string,
  request: SubmitCancellationRequest,
): Promise<CancellationRequest> {
  return apiClient.post(`${bookingRef(ref)}/cancellation-requests`, {
    ...SLOW_START,
    body: request,
    schema: requestSchema,
  });
}

const requestListSchema = z.object({
  items: z.array(requestSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});
export type CancellationRequestList = z.infer<typeof requestListSchema>;

export interface CancellationRequestsParams {
  page?: number;
  /** 1–100; backend default 20. */
  limit?: number;
  status?: CancellationStatus;
}

/** GET /me/cancellation-requests, paged by the backend. */
export function getCancellationRequests(
  params: CancellationRequestsParams,
  signal?: AbortSignal,
): Promise<CancellationRequestList> {
  return apiClient.get("/me/cancellation-requests", {
    ...SLOW_START,
    query: { ...params },
    signal,
    schema: requestListSchema,
  });
}
