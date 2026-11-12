import { z } from "zod";

import { readMockAccount } from "./mocks/customer-account.store";
import { mockNotFound, mockResponse } from "./mocks/mock-response";

/*
 * A booking's invoice. Amounts are paise.
 *
 * MOCK DATA: no invoice endpoint is published yet. A downloadable PDF also
 * needs one; until then the page offers the browser's print / save as PDF.
 */

const invoiceSchema = z.object({
  invoice_number: z.string(),
  booking_id: z.string(),
  booking_reference: z.string(),
  /** The charter day, "YYYY-MM-DD". */
  charter_date: z.string(),
  issued_on: z.string(),
  issuer: z.object({ name: z.string(), address: z.string() }),
  issued_to: z.object({ full_name: z.string(), email: z.string() }),
  currency: z.string(),
  lines: z.array(
    z.object({
      description: z.string(),
      /** Display text: "1", "8 guests", "As charged". */
      quantity: z.string(),
      amount: z.number(),
    }),
  ),
  total_amount: z.number(),
  payment_status: z.enum(["paid", "partially_paid", "unpaid", "refunded"]),
});
export type Invoice = z.infer<typeof invoiceSchema>;

/** 404 `INVOICE_NOT_FOUND` when the booking has no invoice (or is not this customer's). */
export function getBookingInvoice(bookingId: string, signal?: AbortSignal): Promise<Invoice> {
  const invoice = readMockAccount().invoices.find((item) => item.booking_id === bookingId);
  if (!invoice) return mockNotFound("INVOICE_NOT_FOUND", signal);
  return mockResponse(invoiceSchema, invoice, signal);
}
