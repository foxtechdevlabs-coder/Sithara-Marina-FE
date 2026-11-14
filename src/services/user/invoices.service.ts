import { z } from "zod";

import { apiClient } from "@/services/http/api-client";

/*
 * A booking's tax invoice. Amounts are paise. The endpoint takes the booking's
 * id (UUID, from GET /me/bookings/{ref}), not its reference.
 */

const invoiceSchema = z.object({
  id: z.string(),
  booking_id: z.string(),
  invoice_number: z.string().nullable(),
  financial_year: z.string(),
  /** generated: `download_url` works · pending_generation: call again · pending_configuration: not set up yet. */
  status: z.enum(["pending_configuration", "pending_generation", "generated"]),
  provider: z.object({
    legal_name: z.string().nullable(),
    gstin: z.string().nullable(),
    address: z.string().nullable(),
  }),
  customer: z.object({ name: z.string(), email: z.string(), phone: z.string().nullable() }),
  charter_price_paise: z.number(),
  addons_price_paise: z.number(),
  gst_rate_applied: z.number(),
  gst_amount_paise: z.number(),
  total_amount_paise: z.number(),
  payment_method: z.enum(["gateway", "cash", "bank_transfer"]).nullable(),
  payment_reference: z.string().nullable(),
  /** A signed link to the PDF, valid for one hour. */
  download_url: z.string().nullable(),
  created_at: z.string(),
});
export type Invoice = z.infer<typeof invoiceSchema>;

/**
 * GET /bookings/{id}/invoice. 404 `BOOKING_NOT_FOUND` (unknown or another
 * customer's) · 409 `INVOICE_NOT_AVAILABLE` (the booking is not confirmed).
 */
export function getBookingInvoice(bookingId: string, signal?: AbortSignal): Promise<Invoice> {
  return apiClient.get(`/bookings/${encodeURIComponent(bookingId)}/invoice`, {
    signal,
    schema: invoiceSchema,
  });
}
