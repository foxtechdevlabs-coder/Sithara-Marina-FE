import { z } from "zod";

import { apiClient } from "@/services/http/api-client";

import { bookingStatusSchema } from "./booking.service";

/*
 * Customer cancellation requests. Staff decide each request and the refund;
 * the UI only shows what the backend returns. A request's progress (and the
 * refund's) is read again from the booking: GET /me/bookings/{ref}.
 */

/** Reasons offered in the form; sent as the free-text `reason`. */
export const CANCELLATION_REASONS = [
  "My travel plans have changed",
  "Weather or sea conditions",
  "A health or family matter",
  "Something else",
] as const;

/** The backend's limit for `reason`. */
export const CANCELLATION_REASON_MAX = 1000;

const bookingPath = (reference: string) => `/me/bookings/${encodeURIComponent(reference)}`;

// ── Preview ─────────────────────────────────────────────────────────────────

const cancellationPreviewSchema = z.object({
  booking_reference: z.string(),
  /** Whether a request would be accepted now. */
  can_request: z.boolean(),
  blocked_reason: z.enum(["not_confirmed", "charter_started", "request_pending"]).nullable(),
  paid_amount: z.number(),
  refunded_amount: z.number(),
  refund_pending_amount: z.number(),
  /** The most that could still be given back. */
  refundable_amount: z.number(),
  refund_channel: z.enum(["gateway", "offline", "mixed"]).nullable(),
  currency: z.string(),
  /** Negative once the charter has begun. */
  minutes_before_departure: z.number(),
  /** The cancellation policy text from settings. */
  cancellation_summary: z.string().nullable(),
  /** What the policy would refund; null until the cancellation rules are decided. */
  policy_refund: z.number().nullable(),
});
export type CancellationPreview = z.infer<typeof cancellationPreviewSchema>;

/** GET /me/bookings/{ref}/cancellation-preview. 404 `BOOKING_NOT_FOUND`. */
export function getCancellationPreview(
  reference: string,
  signal?: AbortSignal,
): Promise<CancellationPreview> {
  return apiClient.get(`${bookingPath(reference)}/cancellation-preview`, {
    signal,
    schema: cancellationPreviewSchema,
  });
}

// ── Requests ────────────────────────────────────────────────────────────────

const cancellationRequestSchema = z.object({
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
  status: z.enum(["pending", "approved", "rejected"]),
  reason: z.string().nullable(),
  requested_at: z.string(),
  decided_at: z.string().nullable(),
  /** What staff wrote when deciding. */
  decision_reason: z.string().nullable(),
  refund_decision: z.enum(["full", "partial", "none"]).nullable(),
  /** Paise; the refund decided. */
  refund_amount: z.number().nullable(),
  currency: z.string(),
});
export type CancellationRequest = z.infer<typeof cancellationRequestSchema>;

/**
 * POST /me/bookings/{ref}/cancellation-requests → 201.
 * 400 blank or too-long reason · 404 `BOOKING_NOT_FOUND` ·
 * 409 `CANCELLATION_NOT_ALLOWED` (not confirmed, or the charter has started) /
 * `CANCELLATION_REQUEST_EXISTS` (one is already waiting).
 */
export function requestCancellation(
  reference: string,
  reason: string | null,
): Promise<CancellationRequest> {
  return apiClient.post(`${bookingPath(reference)}/cancellation-requests`, {
    body: reason ? { reason } : {},
    schema: cancellationRequestSchema,
  });
}

/** GET /me/cancellation-requests (first page of up to 100), optionally by status. */
export async function listMyCancellationRequests(
  status?: CancellationRequest["status"],
  signal?: AbortSignal,
): Promise<CancellationRequest[]> {
  const page = await apiClient.get("/me/cancellation-requests", {
    query: { status, limit: 100 },
    signal,
    schema: z.object({ items: z.array(cancellationRequestSchema) }),
  });
  return page.items;
}
