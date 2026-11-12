import { z } from "zod";

import { MOCK_REFUND_SHARE } from "./mocks/customer-account.mock";
import {
  MOCK_REFUND_MS,
  MOCK_REVIEW_MS,
  readMockAccount,
  updateMockAccount,
  type MockAccount,
  type MockCancellation,
} from "./mocks/customer-account.store";
import { mockNotFound, mockResponse } from "./mocks/mock-response";

/*
 * Customer cancellation requests and their refunds. Eligibility and refund
 * amounts are decided by the backend from the booking's cancellation policy;
 * the UI only presents them.
 *
 * MOCK DATA: no customer cancellation endpoint is published yet. To show every
 * state of the flow, a mock request is approved `MOCK_REVIEW_MS` after it is
 * sent (the booking becomes cancelled, a refund starts) and the refund
 * completes `MOCK_REFUND_MS` later.
 */

export const CANCELLATION_REASONS = [
  "My travel plans have changed",
  "Weather or sea conditions",
  "A health or family matter",
  "Something else",
] as const;

export interface CancellationRequest {
  reason: string;
  note: string | null;
}

const cancellationSchema = z.object({
  booking_id: z.string(),
  booking_reference: z.string(),
  /** "CAN-SM-1048". */
  reference: z.string(),
  status: z.enum(["requested", "approved", "declined"]),
  reason: z.string(),
  note: z.string().nullable(),
  yacht_name: z.string(),
  date: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  currency: z.string(),
  refund: z
    .object({
      /** "REF-1048". */
      reference: z.string(),
      /** Paise. */
      amount: z.number(),
      /** "Original payment method". */
      method: z.string(),
      status: z.enum(["processing", "completed", "failed"]),
    })
    .nullable(),
});
export type Cancellation = z.infer<typeof cancellationSchema>;

/** "SM-2026-1048" → "1048". */
const referenceNumber = (reference: string) => reference.split("-").at(-1) ?? reference;

/** Moves mock requests on by the time that has passed (see the note above). */
function advanceMockCancellations(): MockAccount {
  const now = Date.now();
  return updateMockAccount((account) => {
    for (const cancellation of account.cancellations) {
      const booking = account.bookings.find((item) => item.id === cancellation.booking_id);
      if (!booking) continue;
      if (
        cancellation.status === "requested" &&
        now - cancellation.requested_at >= MOCK_REVIEW_MS
      ) {
        cancellation.status = "approved";
        cancellation.refund = {
          reference: `REF-${referenceNumber(booking.reference)}`,
          amount: Math.round(booking.total_amount * MOCK_REFUND_SHARE),
          method: "Original payment method",
          status: "processing",
        };
        booking.status = "cancelled";
      }
      if (
        cancellation.refund?.status === "processing" &&
        now - cancellation.requested_at >= MOCK_REVIEW_MS + MOCK_REFUND_MS
      ) {
        cancellation.refund.status = "completed";
      }
    }
  });
}

function toCancellation(account: MockAccount, cancellation: MockCancellation): Cancellation {
  const booking = account.bookings.find((item) => item.id === cancellation.booking_id);
  return {
    booking_id: cancellation.booking_id,
    booking_reference: booking?.reference ?? cancellation.booking_id,
    reference: cancellation.reference,
    status: cancellation.status,
    reason: cancellation.reason,
    note: cancellation.note,
    yacht_name: booking?.yacht.name ?? "",
    date: booking?.date ?? "",
    start_time: booking?.start_time ?? "",
    end_time: booking?.end_time ?? "",
    currency: booking?.currency ?? "INR",
    refund: cancellation.refund,
  };
}

/**
 * Sends a cancellation request. 404 `BOOKING_NOT_FOUND` for a booking that is
 * missing, not this customer's or no longer cancellable.
 */
export function requestCancellation(
  bookingId: string,
  request: CancellationRequest,
): Promise<Cancellation> {
  const account = readMockAccount();
  const booking = account.bookings.find((item) => item.id === bookingId);
  if (!booking || !booking.can_cancel || !request.reason) return mockNotFound("BOOKING_NOT_FOUND");

  const cancellation: MockCancellation = {
    booking_id: bookingId,
    reference: `CAN-SM-${referenceNumber(booking.reference)}`,
    reason: request.reason,
    note: request.note,
    requested_at: Date.now(),
    status: "requested",
    refund: null,
  };
  const updated = updateMockAccount((draft) => {
    draft.cancellations = [
      ...draft.cancellations.filter((item) => item.booking_id !== bookingId),
      cancellation,
    ];
    const stored = draft.bookings.find((item) => item.id === bookingId);
    if (stored) stored.can_cancel = false;
  });
  return mockResponse(cancellationSchema, toCancellation(updated, cancellation));
}

/** 404 `CANCELLATION_NOT_FOUND` when no cancellation was requested for the booking. */
export function getCancellation(bookingId: string, signal?: AbortSignal): Promise<Cancellation> {
  const account = advanceMockCancellations();
  const cancellation = account.cancellations.find((item) => item.booking_id === bookingId);
  if (!cancellation) return mockNotFound("CANCELLATION_NOT_FOUND", signal);
  return mockResponse(cancellationSchema, toCancellation(account, cancellation), signal);
}

/** Every cancellation of the customer's bookings (for the bookings lists). */
export function listMyCancellations(signal?: AbortSignal): Promise<Cancellation[]> {
  const account = advanceMockCancellations();
  return mockResponse(
    z.array(cancellationSchema),
    account.cancellations.map((item) => toCancellation(account, item)),
    signal,
  );
}
