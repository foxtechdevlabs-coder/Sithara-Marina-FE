import { z } from "zod";

import { apiClient } from "@/services/http/api-client";

/*
 * Requests to the concierge from Help & support, optionally about one of the
 * customer's bookings. Addressed by `reference` ("SUP-2026-0001").
 */

export const SUPPORT_CATEGORIES = ["general", "booking", "payment", "refund", "other"] as const;
export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export const SUPPORT_SUBJECT_MAX = 200;
export const SUPPORT_MESSAGE_MAX = 5000;

const supportRequestSchema = z.object({
  id: z.string(),
  reference: z.string(),
  subject: z.string(),
  message: z.string(),
  category: z.enum(SUPPORT_CATEGORIES).nullable(),
  booking_reference: z.string().nullable(),
  status: z.literal("submitted"),
  created_at: z.string(),
});
export type SupportRequest = z.infer<typeof supportRequestSchema>;

export interface CreateSupportRequest {
  subject: string;
  message: string;
  category?: SupportCategory;
  /** One of the customer's own bookings. */
  booking_reference?: string;
}

const createdSupportRequestSchema = supportRequestSchema.extend({
  /** False: the same subject and message were sent in the last 5 minutes; this is that request. */
  created: z.boolean(),
});

/**
 * POST /me/support-requests → 201 (or 200 for a repeat within 5 minutes,
 * `created: false`). 400 missing / too long, or `INVALID_BOOKING_REFERENCE` ·
 * 429 more than 10 a minute.
 */
export function createSupportRequest(
  request: CreateSupportRequest,
): Promise<z.infer<typeof createdSupportRequestSchema>> {
  return apiClient.post("/me/support-requests", {
    body: request,
    schema: createdSupportRequestSchema,
  });
}

/** GET /me/support-requests (first page of up to 100). */
export async function listMySupportRequests(signal?: AbortSignal): Promise<SupportRequest[]> {
  const page = await apiClient.get("/me/support-requests", {
    query: { limit: 100 },
    signal,
    schema: z.object({ items: z.array(supportRequestSchema) }),
  });
  return page.items;
}

/** GET /me/support-requests/{reference}. 404 for a request that is not this customer's. */
export function getMySupportRequest(
  reference: string,
  signal?: AbortSignal,
): Promise<SupportRequest> {
  return apiClient.get(`/me/support-requests/${encodeURIComponent(reference)}`, {
    signal,
    schema: supportRequestSchema,
  });
}
