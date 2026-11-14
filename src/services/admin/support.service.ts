import { z } from "zod";

import { adminApiClient } from "./admin-api-client";

/*
 * Customer support requests (backend: /admin/support-requests, needs
 * support:read). Customers send them from their account (POST
 * /me/support-requests); staff read them here and reply by email.
 */

export const SUPPORT_CATEGORIES = ["general", "booking", "payment", "refund", "other"] as const;
export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

/** AdminSupportRequestDto */
export const supportRequestSchema = z.object({
  id: z.string(),
  reference: z.string(),
  subject: z.string(),
  message: z.string(),
  /** general, booking, payment, refund, other — or none. */
  category: z.string().nullable(),
  booking_reference: z.string().nullable(),
  /** Only "submitted" so far. */
  status: z.string(),
  created_at: z.string(),
  /** Name and email as they were when the request was sent. */
  customer: z.object({ id: z.string(), name: z.string(), email: z.string() }),
  booking_id: z.string().nullable(),
});
export type SupportRequest = z.infer<typeof supportRequestSchema>;

const supportListSchema = z.object({
  items: z.array(supportRequestSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});
export type SupportRequestList = z.infer<typeof supportListSchema>;

export interface SupportQuery {
  page?: number;
  limit?: number;
  /** Matches the reference, subject, customer name or email. */
  search?: string;
  category?: SupportCategory;
}

/** GET /admin/support-requests — newest first. */
export function listSupportRequests(query: SupportQuery = {}, signal?: AbortSignal) {
  return adminApiClient.get("/admin/support-requests", {
    query: { ...query },
    schema: supportListSchema,
    signal,
  });
}

/** GET /admin/support-requests/{id} — 404 when there's no such request. */
export function getSupportRequest(id: string, signal?: AbortSignal) {
  return adminApiClient.get(`/admin/support-requests/${encodeURIComponent(id)}`, {
    schema: supportRequestSchema,
    signal,
  });
}
