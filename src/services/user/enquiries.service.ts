import { z } from "zod";

import { apiClient } from "@/services/http/api-client";

/*
 * The signed-in customer's charter enquiries and the proposals staff sent for
 * them. Enquiries are addressed by `reference` ("ENQ-2026-0001"), proposals by
 * `id` (UUID). Amounts are paise.
 */

const yachtRefSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string().optional().default(""),
});

export const ENQUIRY_STATUSES = [
  "new",
  "in_progress",
  "proposal_sent",
  "accepted",
  "rejected",
  "closed",
] as const;

const enquirySchema = z.object({
  id: z.string(),
  reference: z.string(),
  status: z.enum(ENQUIRY_STATUSES),
  yacht: yachtRefSchema.nullish(),
  slot_type: z.object({ id: z.string(), name: z.string() }).nullish(),
  preferred_date: z.string().nullable().optional(),
  preferred_start_time: z.string().nullish(),
  guests: z.number().nullable().optional(),
  destinations: z.array(z.string()).optional().default([]),
  occasion: z.string().nullish(),
  budget: z.string().nullish(),
  preferences: z.string().nullish(),
  message: z.string().nullish(),
  created_at: z.string(),
});
export type Enquiry = z.infer<typeof enquirySchema>;

const proposalSchema = z.object({
  id: z.string(),
  enquiry_id: z.string(),
  enquiry_reference: z.string().optional().default(""),
  version: z.number().default(1),
  status: z.enum(["draft", "sent", "accepted", "rejected", "superseded", "expired"]),
  yacht: yachtRefSchema.nullish(),
  slot_type_id: z.string().nullable().optional(),
  slot_type_name: z.string().nullable().optional().default(""),
  date: z.string(),
  start_time: z.string().optional().default(""),
  end_time: z.string().optional().default(""),
  guests: z.number().default(1),
  inclusions: z.array(z.string()).nullish().transform((v) => v ?? []),
  message: z.string().nullable().optional(),
  terms: z.string().nullable().optional(),
  /** As last saved or sent; re-checked when accepted and at checkout. */
  pricing: z.object({
    currency: z.string().default("INR"),
    charter_amount: z.number().default(0),
    addons: z
      .array(
        z.object({
          addon_id: z.string(),
          name: z.string(),
          quantity: z.number(),
          unit_price: z.number(),
          amount: z.number(),
        }),
      )
      .nullish()
      .transform((v) => v ?? []),
    addons_amount: z.number().default(0),
    subtotal: z.number().default(0),
    tax_rate: z.number().nullish().default(null),
    tax_amount: z.number().nullish().default(null),
    total_amount: z.number().nullish().default(null),
  }),
  expires_at: z.string().nullable().optional(),
  sent_at: z.string().nullable().optional(),
  decided_at: z.string().nullable().optional(),
  decision_comment: z.string().nullable().optional(),
  /** The checkout started when it was accepted. */
  checkout_session_id: z.string().nullable().optional(),
  created_at: z.string(),
});
export type Proposal = z.infer<typeof proposalSchema>;

const enquiryDetailSchema = enquirySchema.extend({
  /** Sent proposals, newest version first; drafts never show. */
  proposals: z.array(proposalSchema).nullish().transform((v) => v ?? []),
});
export type EnquiryDetail = z.infer<typeof enquiryDetailSchema>;

/** GET /me/enquiries (first page of up to 100). */
export async function listMyEnquiries(signal?: AbortSignal): Promise<Enquiry[]> {
  const page = await apiClient.get("/me/enquiries", {
    query: { limit: 100 },
    signal,
    schema: z.object({ items: z.array(enquirySchema) }),
  });
  return page.items;
}

/** GET /me/enquiries/{ref}. 404 for an enquiry that is not this customer's. */
export function getMyEnquiry(reference: string, signal?: AbortSignal): Promise<EnquiryDetail> {
  return apiClient.get(`/me/enquiries/${encodeURIComponent(reference)}`, {
    signal,
    schema: enquiryDetailSchema,
  });
}

/** GET /me/proposals/{id}. 404 for a proposal that is not this customer's. */
export function getMyProposal(proposalId: string, signal?: AbortSignal): Promise<Proposal> {
  return apiClient.get(`/me/proposals/${encodeURIComponent(proposalId)}`, {
    signal,
    schema: proposalSchema,
  });
}

/** Longest comment accepted with a decision. */
export const PROPOSAL_COMMENT_MAX = 2000;

const acceptProposalResponseSchema = z.object({
  proposal: proposalSchema,
  /** checkout: continue with `checkout_session_id` · staff_follow_up: the concierge takes it from here. */
  next_step: z.enum(["checkout", "staff_follow_up"]),
  checkout_session_id: z.string().nullable(),
  /** Today's price differs from the proposal; the new total is shown at checkout. */
  price_changed: z.boolean(),
});
export type AcceptProposalResponse = z.infer<typeof acceptProposalResponseSchema>;

const decisionBody = (comment: string) => (comment.trim() ? { comment: comment.trim() } : {});

/**
 * POST /me/proposals/{id}/accept. 409 `PROPOSAL_NOT_OPEN`, or
 * `SLOT_DOUBLE_BOOKED` / `BUFFER_TIME_VIOLATION` / `SLOT_NOT_AVAILABLE` /
 * `PRICE_NOT_AVAILABLE` (ask for a new proposal).
 */
export function acceptProposal(proposalId: string, comment = ""): Promise<AcceptProposalResponse> {
  return apiClient.post(`/me/proposals/${encodeURIComponent(proposalId)}/accept`, {
    body: decisionBody(comment),
    schema: acceptProposalResponseSchema,
  });
}

/** POST /me/proposals/{id}/reject. 409 `PROPOSAL_NOT_OPEN`. */
export function rejectProposal(proposalId: string, comment = ""): Promise<Proposal> {
  return apiClient.post(`/me/proposals/${encodeURIComponent(proposalId)}/reject`, {
    body: decisionBody(comment),
    schema: proposalSchema,
  });
}
