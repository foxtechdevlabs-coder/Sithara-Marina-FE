import { z } from "zod";

import { adminApiClient } from "./admin-api-client";

/*
 * Customer cancellation requests (backend: /admin/cancellation-requests,
 * needs bookings:read / bookings:write). Approving cancels the booking and
 * records a refund decision; the refund itself is made on Payments & refunds.
 * Amounts are paise. Enum-like fields are read as strings.
 */

const person = z.object({ id: z.string().nullable(), name: z.string() });

const requestBookingSchema = z.object({
  id: z.string(),
  reference: z.string(),
  status: z.string(),
  yacht_id: z.string(),
  yacht_name: z.string(),
  /** Local charter date. */
  date: z.string().nullable(),
  start_time: z.string().nullable(),
  end_time: z.string().nullable(),
  starts_at: z.string(),
  contact_name: z.string(),
  contact_email: z.string(),
  contact_phone: z.string().nullable(),
  total_amount: z.number(),
  currency: z.string(),
});

/** CancellationRequestDto */
export const cancellationRequestSchema = z.object({
  id: z.string(),
  /** pending, approved, rejected */
  status: z.string(),
  /** The customer's reason. */
  reason: z.string().nullable(),
  requested_at: z.string(),
  /** Null if the customer's account is gone. */
  requested_by: person.nullable(),
  booking: requestBookingSchema,
  decided_at: z.string().nullable(),
  decided_by: person.nullable(),
  /** Shown to the customer. */
  decision_reason: z.string().nullable(),
  /** full, partial, none */
  refund_decision: z.string().nullable(),
  /** A decision, not a refund made. */
  refund_amount: z.number().nullable(),
});
export type CancellationRequest = z.infer<typeof cancellationRequestSchema>;

/** CancellationRequestDetailDto */
export const cancellationRequestDetailSchema = cancellationRequestSchema.extend({
  refund_preview: z.object({
    /** Captured. */
    paid_amount: z.number(),
    refunded_amount: z.number(),
    /** Refunds asked for, or offline ones still to hand back. */
    refund_pending_amount: z.number(),
    /** The most a refund may be. */
    refundable_amount: z.number(),
    /** gateway or offline; null when nothing was paid. */
    refund_channel: z.string().nullable(),
    currency: z.string(),
    minutes_before_departure_at_request: z.number(),
    /** Negative once the charter has begun. */
    minutes_before_departure_now: z.number(),
    /** The cancellation policy text customers see. */
    cancellation_summary: z.string().nullable(),
    /** Always null until cancellation rules are decided. */
    policy_refund: z.number().nullable(),
  }),
});
export type CancellationRequestDetail = z.infer<typeof cancellationRequestDetailSchema>;

const listSchema = z.object({
  items: z.array(cancellationRequestSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export interface CancellationRequestQuery {
  page?: number;
  limit?: number;
  status?: "pending" | "approved" | "rejected";
  yacht_id?: string;
  /** Booking reference, or contact name, email or phone. */
  search?: string;
  /** By request time; oldest works through a queue. */
  sort?: "newest" | "oldest";
}

/** ApproveCancellationRequestDto */
export interface ApproveInput {
  /** A booking with nothing paid can only be "none". */
  refund_decision: "full" | "partial" | "none";
  /** Partial only: more than 0 and less than what was paid. */
  refund_amount?: number;
  /** Shown to the customer as decision_reason. */
  reason?: string;
}

const path = (id: string) => `/admin/cancellation-requests/${encodeURIComponent(id)}`;

/** GET /admin/cancellation-requests */
export function listCancellationRequests(
  query: CancellationRequestQuery = {},
  signal?: AbortSignal,
) {
  return adminApiClient.get("/admin/cancellation-requests", {
    query: { ...query },
    schema: listSchema,
    signal,
  });
}

/**
 * The customer's undecided cancellation request for this booking, or null when
 * they haven't asked to cancel (searched by its reference, then matched by id).
 */
export async function findPendingCancellationRequest(
  bookingId: string,
  reference: string,
  signal?: AbortSignal,
) {
  const list = await listCancellationRequests(
    { status: "pending", search: reference, limit: 5 },
    signal,
  );
  return list.items.find((r) => r.booking.id === bookingId) ?? null;
}

/** GET /admin/cancellation-requests/{id} — with the refund preview. */
export function getCancellationRequest(
  id: string,
  signal?: AbortSignal,
): Promise<CancellationRequestDetail> {
  return adminApiClient.get(path(id), { schema: cancellationRequestDetailSchema, signal });
}

/** POST /admin/cancellation-requests/{id}/approve — cancels the booking. */
export function approveCancellationRequest(id: string, input: ApproveInput) {
  return adminApiClient.post(`${path(id)}/approve`, {
    body: input,
    schema: cancellationRequestSchema,
  });
}

/** POST /admin/cancellation-requests/{id}/reject — the reason is shown to the customer. */
export function rejectCancellationRequest(id: string, reason: string) {
  return adminApiClient.post(`${path(id)}/reject`, {
    body: { reason },
    schema: cancellationRequestSchema,
  });
}
