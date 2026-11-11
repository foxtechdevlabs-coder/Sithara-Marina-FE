import { z } from "zod";

import { apiClient } from "@/services/http/api-client";

/*
 * A customer's enquiries and the proposals sent for them. Contract: the
 * backend's Swagger docs at `<NEXT_PUBLIC_API_BASE_URL>/docs`. Every call needs
 * the signed-in customer's bearer token, attached by the shared client.
 * Amounts are paise and always the backend's.
 */

/** The hosted backend can take ~40 s to wake from idle (Render). */
const SLOW_START = { timeoutMs: 60_000 } as const;

/** `ProposalDecisionDto.comment` maxLength in Swagger. The comment is optional. */
export const PROPOSAL_COMMENT_MAX_LENGTH = 2000;

const proposalPath = (id: string) => `/me/proposals/${encodeURIComponent(id)}`;

export const enquiryStatusSchema = z.enum([
  "new",
  "in_progress",
  "proposal_sent",
  "accepted",
  "rejected",
  "closed",
]);
export type EnquiryStatus = z.infer<typeof enquiryStatusSchema>;

export const proposalStatusSchema = z.enum([
  "draft",
  "sent",
  "accepted",
  "rejected",
  "superseded",
  "expired",
]);
export type ProposalStatus = z.infer<typeof proposalStatusSchema>;

/** Error codes documented for the proposal decisions. */
export type ProposalErrorCode =
  | "PROPOSAL_NOT_OPEN"
  | "SLOT_DOUBLE_BOOKED"
  | "BUFFER_TIME_VIOLATION"
  | "SLOT_NOT_AVAILABLE"
  | "PRICE_NOT_AVAILABLE";

const enquiryFields = {
  id: z.string(),
  reference: z.string(),
  status: enquiryStatusSchema,
  yacht: z.object({ id: z.string(), name: z.string(), slug: z.string() }).nullable(),
  slot_type: z.object({ id: z.string(), name: z.string() }).nullable(),
  preferred_date: z.string().nullable(),
  preferred_start_time: z.string().nullable(),
  guests: z.number().nullable(),
  message: z.string().nullable(),
  created_at: z.string(),
};
const enquirySchema = z.object(enquiryFields);
export type Enquiry = z.infer<typeof enquirySchema>;

const proposalSchema = z.object({
  id: z.string(),
  enquiry_id: z.string(),
  enquiry_reference: z.string(),
  version: z.number(),
  status: proposalStatusSchema,
  yacht: z.object({ id: z.string(), name: z.string(), slug: z.string() }),
  slot_type_id: z.string().nullable(),
  slot_type_name: z.string(),
  date: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  guests: z.number(),
  inclusions: z.array(z.string()),
  message: z.string().nullable(),
  terms: z.string().nullable(),
  /** As last sent; re-checked when accepted and at checkout. */
  pricing: z.object({
    currency: z.string(),
    charter_amount: z.number(),
    addons: z.array(
      z.object({
        addon_id: z.string(),
        name: z.string(),
        quantity: z.number(),
        unit_price: z.number(),
        amount: z.number(),
      }),
    ),
    addons_amount: z.number(),
    subtotal: z.number(),
    /** Null until the GST rate is set. */
    tax_rate: z.number().nullable(),
    tax_amount: z.number().nullable(),
    total_amount: z.number().nullable(),
  }),
  expires_at: z.string().nullable(),
  sent_at: z.string().nullable(),
  decided_at: z.string().nullable(),
  decision_comment: z.string().nullable(),
  /** The checkout started when it was accepted. */
  checkout_session_id: z.string().nullable(),
  created_at: z.string(),
});
export type Proposal = z.infer<typeof proposalSchema>;

const enquiryListSchema = z.object({
  items: z.array(enquirySchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});
export type EnquiryList = z.infer<typeof enquiryListSchema>;

export interface EnquiriesParams {
  page?: number;
  /** 1–100; backend default 20. */
  limit?: number;
}

// ── New enquiry ─────────────────────────────────────────────────────────────

/** `CreateEnquiryDto` limits in Swagger (`maxLength` of `full_name` and `message`). */
export const ENQUIRY_NAME_MAX_LENGTH = 255;
export const ENQUIRY_MESSAGE_MAX_LENGTH = 2000;
/** `context` is stored as sent, up to 4 KB. */
export const ENQUIRY_CONTEXT_MAX_BYTES = 4096;

/** `CreateEnquiryDto`. Only `full_name` and `phone` are always required. */
export interface CreateEnquiryRequest {
  full_name: string;
  /** Required for a guest. A signed-in customer leaves it out (if sent, it must be theirs). */
  email?: string;
  /** E.164. */
  phone: string;
  /** The yacht's backend id (never its slug). */
  yacht_id?: string;
  /** A package of that yacht; needs `yacht_id`. */
  slot_type_id?: string;
  /** Local date, today or later. */
  preferred_date?: string;
  /** Local time, HH:mm. */
  preferred_start_time?: string;
  /** At least 1. */
  guests?: number;
  message?: string;
  /** The choices the customer made, stored as sent. */
  context?: Record<string, unknown>;
}

const enquiryCreatedSchema = z.object({
  enquiry_id: z.string(),
  reference: z.string(),
  status: enquiryStatusSchema,
  created_at: z.string(),
});
export type EnquiryCreated = z.infer<typeof enquiryCreatedSchema>;

/**
 * POST /enquiries, with the customer's bearer token when signed in and no
 * credential for a guest. 400 validation, `INVALID_SLOT_TYPE`,
 * `GUESTS_EXCEED_CAPACITY` · 401 invalid Authorization · 403 staff token ·
 * 404 `YACHT_NOT_FOUND` · 429 ten a minute per address (`Retry-After`).
 */
export function createEnquiry(request: CreateEnquiryRequest): Promise<EnquiryCreated> {
  return apiClient.post("/enquiries", { ...SLOW_START, body: request, schema: enquiryCreatedSchema });
}

/** GET /me/enquiries, paged by the backend. */
export function getMyEnquiries(params: EnquiriesParams, signal?: AbortSignal): Promise<EnquiryList> {
  return apiClient.get("/me/enquiries", {
    ...SLOW_START,
    query: { ...params },
    signal,
    schema: enquiryListSchema,
  });
}

const enquiryDetailSchema = z.object({
  ...enquiryFields,
  /** Newest version first; drafts never show. */
  proposals: z.array(proposalSchema),
});
export type EnquiryDetail = z.infer<typeof enquiryDetailSchema>;

/** GET /me/enquiries/{ref}: the enquiry with every proposal sent for it. 404 not yours. */
export function getMyEnquiryDetails(ref: string, signal?: AbortSignal): Promise<EnquiryDetail> {
  return apiClient.get(`/me/enquiries/${encodeURIComponent(ref)}`, {
    ...SLOW_START,
    signal,
    schema: enquiryDetailSchema,
  });
}

/** GET /me/proposals/{id}. 404 not yours. */
export function getMyProposal(id: string, signal?: AbortSignal): Promise<Proposal> {
  return apiClient.get(proposalPath(id), { ...SLOW_START, signal, schema: proposalSchema });
}

export interface ProposalDecision {
  /** Optional, up to 2000 characters. */
  comment?: string;
}

const acceptResponseSchema = z.object({
  proposal: proposalSchema,
  /**
   * `checkout`: continue with `checkout_session_id` (hold, booking, payment).
   * `staff_follow_up`: this yacht does not book online; staff arrange it.
   */
  next_step: z.enum(["checkout", "staff_follow_up"]),
  checkout_session_id: z.string().nullable(),
  /** Today's price differs from the proposal's: the new total is reviewed at checkout. */
  price_changed: z.boolean(),
});
export type AcceptProposalResponse = z.infer<typeof acceptResponseSchema>;

/**
 * POST /me/proposals/{id}/accept. 409 `PROPOSAL_NOT_OPEN`, or
 * `SLOT_DOUBLE_BOOKED`, `BUFFER_TIME_VIOLATION`, `SLOT_NOT_AVAILABLE`,
 * `PRICE_NOT_AVAILABLE`: a new proposal is needed.
 */
export function acceptProposal(
  id: string,
  decision: ProposalDecision,
): Promise<AcceptProposalResponse> {
  return apiClient.post(`${proposalPath(id)}/accept`, {
    ...SLOW_START,
    body: decision,
    schema: acceptResponseSchema,
  });
}

/** POST /me/proposals/{id}/reject. 409 `PROPOSAL_NOT_OPEN`. */
export function rejectProposal(id: string, decision: ProposalDecision): Promise<Proposal> {
  return apiClient.post(`${proposalPath(id)}/reject`, {
    ...SLOW_START,
    body: decision,
    schema: proposalSchema,
  });
}
