import { z } from "zod";

import { readMockAccount } from "./mocks/customer-account.store";
import { mockResponse } from "./mocks/mock-response";

/*
 * The signed-in customer's charter enquiries (custom quotes from "Plan your
 * charter") and the proposals prepared for them.
 *
 * MOCK DATA: no customer enquiries endpoint is published yet.
 */

const enquirySchema = z.object({
  id: z.string(),
  reference: z.string(),
  yacht_name: z.string().nullable(),
  preferred_date: z.string().nullable(),
  guest_count: z.number(),
  occasion: z.string().nullable(),
  submitted_on: z.string(),
  status: z.enum(["received", "in_review", "proposal_ready", "booked", "closed"]),
});
export type Enquiry = z.infer<typeof enquirySchema>;

export function listMyEnquiries(signal?: AbortSignal): Promise<Enquiry[]> {
  return mockResponse(z.array(enquirySchema), readMockAccount().enquiries, signal);
}
