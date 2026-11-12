import { z } from "zod";

import { bookingStatusSchema } from "./booking.service";
import { readMockAccount } from "./mocks/customer-account.store";
import { mockNotFound, mockResponse } from "./mocks/mock-response";

/*
 * The signed-in customer's bookings (account area). Amounts are paise.
 *
 * MOCK DATA: no customer "my bookings" endpoint is published yet. The schema
 * reuses the booking statuses of `booking.service.ts`. When the contract
 * exists, replace each body with an `apiClient` call and keep the schemas.
 */

const customerBookingSchema = z.object({
  id: z.string(),
  reference: z.string(),
  status: bookingStatusSchema,
  yacht: z.object({
    id: z.string(),
    slug: z.string(),
    name: z.string(),
    image_url: z.string().nullable(),
  }),
  date: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  duration_minutes: z.number(),
  /** IANA zone of the charter times, e.g. "Asia/Kolkata". */
  time_zone: z.string(),
  departure: z.string(),
  /** "Private, fully crewed". */
  service: z.string(),
  guest_count: z.number(),
  /** Most guests the yacht takes. */
  capacity: z.number(),
  lead_guest: z.string(),
  /** Catering and extras, e.g. "Seasonal menu · 8 guests". */
  on_board: z.string().nullable(),
  currency: z.string(),
  /** The backend's figures, shown as given; nothing is added up in the UI. */
  price_lines: z.array(z.object({ label: z.string(), amount: z.number() })),
  total_amount: z.number(),
  invoice_number: z.string().nullable(),
  /** Decided by the backend from the cancellation policy; the UI only reflects it. */
  can_cancel: z.boolean(),
});
export type CustomerBooking = z.infer<typeof customerBookingSchema>;

export function listMyBookings(signal?: AbortSignal): Promise<CustomerBooking[]> {
  return mockResponse(z.array(customerBookingSchema), readMockAccount().bookings, signal);
}

/** 404 `BOOKING_NOT_FOUND` for a missing booking or another customer's. */
export function getMyBooking(bookingId: string, signal?: AbortSignal): Promise<CustomerBooking> {
  const booking = readMockAccount().bookings.find((item) => item.id === bookingId);
  if (!booking) return mockNotFound("BOOKING_NOT_FOUND", signal);
  return mockResponse(customerBookingSchema, booking, signal);
}
