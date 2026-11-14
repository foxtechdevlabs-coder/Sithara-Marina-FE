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
export const PROPOSAL_COMMENT_MAX = 2000;
export const PROPOSAL_COMMENT_MAX_LENGTH = 2000;

const proposalPath = (id: string) => `/me/proposals/${encodeURIComponent(id)}`;

export const ENQUIRY_STATUSES = [
  "new",
  "in_progress",
  "proposal_sent",
  "accepted",
  "rejected",
  "closed",
] as const;

export const enquiryStatusSchema = z.enum(ENQUIRY_STATUSES);
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
  yacht: z
    .object({
      id: z.string(),
      name: z.string(),
      slug: z.string().optional().default(""),
    })
    .nullable()
    .optional(),
  slot_type: z.object({ id: z.string(), name: z.string() }).nullable().optional(),
  preferred_date: z.string().nullable().optional(),
  preferred_start_time: z.string().nullable().optional(),
  guests: z.number().nullable().optional(),
  destinations: z.array(z.string()).nullish().default([]),
  occasion: z.string().nullish(),
  budget: z.string().nullish(),
  preferences: z.string().nullish(),
  message: z.string().nullable().optional(),
  created_at: z.string(),
};
const enquirySchema = z.object(enquiryFields);
export type Enquiry = z.infer<typeof enquirySchema>;

const proposalSchema = z.object({
  id: z.string(),
  enquiry_id: z.string(),
  enquiry_reference: z.string().optional().default(""),
  version: z.number().default(1),
  status: proposalStatusSchema,
  yacht: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
  }),
  slot_type_id: z.string().nullable().optional(),
  slot_type_name: z.string().nullable().optional().default(""),
  date: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  guests: z.number().default(1),
  inclusions: z.array(z.string()).nullish().transform((v) => v ?? []),
  message: z.string().nullable(),
  terms: z.string().nullable(),
  /** As last sent; re-checked when accepted and at checkout. */
  pricing: z.object({
    currency: z.string().default("INR"),
    charter_amount: z.number(),
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

/** `CreateEnquiryDto` limits in Swagger. */
export const ENQUIRY_NAME_MAX_LENGTH = 255;
export const ENQUIRY_MESSAGE_MAX_LENGTH = 2000;
export const ENQUIRY_DESTINATIONS_MAX = 10;
export const ENQUIRY_DESTINATION_MAX_LENGTH = 100;
export const ENQUIRY_OCCASION_MAX_LENGTH = 100;
export const ENQUIRY_BUDGET_MAX_LENGTH = 100;
export const ENQUIRY_PREFERENCES_MAX_LENGTH = 2000;
/** `context` is stored as sent, up to 4 KB. */
export const ENQUIRY_CONTEXT_MAX_BYTES = 4096;

const optionalText = (max: number) => z.string().trim().min(1).max(max).optional();

/**
 * `CreateEnquiryDto`, exactly: only `full_name` and `phone` are always required,
 * and nothing else may be sent (the backend answers 400 to any other property,
 * e.g. the retired `slot_type_id`, `preferred_start_time` or an end date).
 * Every request is checked against it before it leaves the browser.
 */
export const createEnquiryRequestSchema = z.strictObject({
  full_name: z.string().trim().min(1).max(ENQUIRY_NAME_MAX_LENGTH),
  /** Required for a guest. A signed-in customer leaves it out (if sent, it must be theirs). */
  email: z.email().optional(),
  /** E.164. */
  phone: z.string().regex(/^\+[1-9]\d{6,14}$/),
  /** The yacht's backend id (never its slug). */
  yacht_id: z.guid().optional(),
  /** Local date (YYYY-MM-DD), today or later. */
  preferred_date: z.iso.date().optional(),
  guests: z.int().min(1).optional(),
  message: optionalText(ENQUIRY_MESSAGE_MAX_LENGTH),
  /** Any places, as typed. */
  destinations: z
    .array(z.string().trim().min(1).max(ENQUIRY_DESTINATION_MAX_LENGTH))
    .min(1)
    .max(ENQUIRY_DESTINATIONS_MAX)
    .optional(),
  /** Any occasion, as typed. */
  occasion: optionalText(ENQUIRY_OCCASION_MAX_LENGTH),
  /** Any budget, as typed: read by staff, never calculated with. */
  budget: optionalText(ENQUIRY_BUDGET_MAX_LENGTH),
  /** Luxuries, services and special requirements, as typed. */
  preferences: optionalText(ENQUIRY_PREFERENCES_MAX_LENGTH),
  /** Other choices the customer made, stored as sent (at most 4 KB). */
  context: z
    .record(z.string(), z.unknown())
    .refine((value) => new TextEncoder().encode(JSON.stringify(value)).length <= ENQUIRY_CONTEXT_MAX_BYTES)
    .optional(),
});
export type CreateEnquiryRequest = z.input<typeof createEnquiryRequestSchema>;

const enquiryCreatedSchema = z.object({
  enquiry_id: z.string(),
  reference: z.string(),
  status: enquiryStatusSchema,
  created_at: z.string(),
});
export type EnquiryCreated = z.infer<typeof enquiryCreatedSchema>;

/**
 * POST /enquiries → 201, with the customer's bearer token when signed in and no
 * credential for a guest. The body is checked against `createEnquiryRequestSchema`
 * first (a ZodError for anything the backend would refuse). Backend errors: 400
 * validation, `GUESTS_EXCEED_CAPACITY` · 401 invalid Authorization · 403 staff
 * token · 404 `YACHT_NOT_FOUND` · 429 ten a minute per address (`Retry-After`).
 */
export async function createEnquiry(request: CreateEnquiryRequest): Promise<EnquiryCreated> {
  const body = createEnquiryRequestSchema.parse(request);
  return apiClient.post("/enquiries", { ...SLOW_START, body, schema: enquiryCreatedSchema });
}

/** GET /me/enquiries, paged by the backend. */
export function getMyEnquiries(
  params?: EnquiriesParams,
  signal?: AbortSignal,
): Promise<EnquiryList> {
  return apiClient.get("/me/enquiries", {
    ...SLOW_START,
    query: params ? { ...params } : undefined,
    signal,
    schema: enquiryListSchema,
  });
}

/** GET /me/enquiries (first page of up to 100). */
export async function listMyEnquiries(signal?: AbortSignal): Promise<Enquiry[]> {
  const page = await getMyEnquiries({ limit: 100 }, signal);
  return page.items;
}

const enquiryDetailSchema = z.object({
  ...enquiryFields,
  /** Newest version first; drafts never show. */
  proposals: z.array(proposalSchema).nullish().transform((v) => v ?? []),
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

/** Legacy/convenience alias for getMyEnquiryDetails. */
export function getMyEnquiry(reference: string, signal?: AbortSignal): Promise<EnquiryDetail> {
  return getMyEnquiryDetails(reference, signal);
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
  decision?: ProposalDecision | string,
): Promise<AcceptProposalResponse> {
  const body =
    typeof decision === "string"
      ? decision.trim()
        ? { comment: decision.trim() }
        : {}
      : decision?.comment?.trim()
        ? { comment: decision.comment.trim() }
        : {};
  return apiClient.post(`${proposalPath(id)}/accept`, {
    ...SLOW_START,
    body,
    schema: acceptResponseSchema,
  });
}

/** POST /me/proposals/{id}/reject. 409 `PROPOSAL_NOT_OPEN`. */
export function rejectProposal(
  id: string,
  decision?: ProposalDecision | string,
): Promise<Proposal> {
  const body =
    typeof decision === "string"
      ? decision.trim()
        ? { comment: decision.trim() }
        : {}
      : decision?.comment?.trim()
        ? { comment: decision.comment.trim() }
        : {};
  return apiClient.post(`${proposalPath(id)}/reject`, {
    ...SLOW_START,
    body,
    schema: proposalSchema,
  });
}
