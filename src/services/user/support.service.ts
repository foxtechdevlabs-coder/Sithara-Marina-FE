import { z } from "zod";

import { readMockAccount, updateMockAccount } from "./mocks/customer-account.store";
import { mockNotFound, mockResponse } from "./mocks/mock-response";

/*
 * Messages to the concierge from Help & support, optionally about a booking.
 *
 * MOCK DATA: no support endpoint is published yet.
 */

export const SUPPORT_TOPICS = ["Booking", "Arrival", "Billing", "Other"] as const;
export type SupportTopic = (typeof SUPPORT_TOPICS)[number];

/** Longest message the form accepts. */
export const SUPPORT_MESSAGE_MAX = 2000;

const supportMessageSchema = z.object({
  /** "HLP-1048". */
  reference: z.string(),
  booking_id: z.string().nullable(),
  booking_reference: z.string().nullable(),
  topic: z.string(),
  message: z.string(),
  sent_on: z.string(),
});
export type SupportMessage = z.infer<typeof supportMessageSchema>;

export interface SendSupportMessageRequest {
  booking_id: string | null;
  topic: SupportTopic;
  message: string;
}

function toSupportMessage(reference: string): SupportMessage | null {
  const account = readMockAccount();
  const stored = account.support_messages.find((item) => item.reference === reference);
  if (!stored) return null;
  const booking = account.bookings.find((item) => item.id === stored.booking_id);
  return { ...stored, booking_reference: booking?.reference ?? null };
}

export function sendSupportMessage(request: SendSupportMessageRequest): Promise<SupportMessage> {
  const account = readMockAccount();
  const booking = account.bookings.find((item) => item.id === request.booking_id);
  // "HLP-1048" for booking SM-2026-1048; a number of its own otherwise.
  const base = `HLP-${booking ? booking.reference.split("-").at(-1) : "2000"}`;
  const taken = account.support_messages.filter((item) => item.reference.startsWith(base)).length;
  const reference = taken ? `${base}-${taken + 1}` : base;

  updateMockAccount((draft) => {
    draft.support_messages.push({
      reference,
      booking_id: booking?.id ?? null,
      topic: request.topic,
      message: request.message,
      sent_on: new Date().toISOString().slice(0, 10),
    });
  });
  return mockResponse(supportMessageSchema, toSupportMessage(reference));
}

/** 404 `SUPPORT_MESSAGE_NOT_FOUND` for an unknown reference. */
export function getSupportMessage(
  reference: string,
  signal?: AbortSignal,
): Promise<SupportMessage> {
  const message = toSupportMessage(reference);
  if (!message) return mockNotFound("SUPPORT_MESSAGE_NOT_FOUND", signal);
  return mockResponse(supportMessageSchema, message, signal);
}
