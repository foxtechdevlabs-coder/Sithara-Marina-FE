import { z } from "zod";

import { adminApiClient } from "./admin-api-client";

/*
 * Enquiries and proposals (backend: /admin/enquiries, /admin/proposals, needs
 * enquiries:read / enquiries:write). A proposal is a priced charter offer in
 * versions: a draft is edited, then sent (published); a sent one is changed by
 * revising it into a new draft. Amounts are paise. Enum-like fields are read
 * as strings so a new backend value doesn't fail the page.
 */

const nullableString = z.string().nullable();
const staffSummary = z.object({ id: z.string(), full_name: z.string() });
const yachtRef = z.object({ id: z.string(), name: z.string(), slug: z.string() });

/** EnquiryDto */
export const enquirySchema = z.object({
  id: z.string(),
  reference: z.string(),
  /** new, in_progress, proposal_sent, accepted, rejected, closed */
  status: z.string(),
  yacht: yachtRef.nullable(),
  slot_type: z.object({ id: z.string(), name: z.string() }).nullable(),
  preferred_date: nullableString,
  preferred_start_time: nullableString,
  guests: z.number().nullable(),
  message: nullableString,
  created_at: z.string(),
  contact: z.object({
    full_name: z.string(),
    email: z.string(),
    phone: z.string().nullable().optional(),
  }),
  /** Set when a signed-in customer sent it. */
  customer_id: nullableString,
  /** The search filters and choices the customer came from, as sent. */
  context: z.record(z.string(), z.unknown()).nullable().default({}),
  assigned_to: staffSummary.nullable(),
  updated_at: z.string(),
});
export type Enquiry = z.infer<typeof enquirySchema>;

/** ProposalDto */
export const proposalSchema = z.object({
  id: z.string(),
  enquiry_id: z.string(),
  enquiry_reference: z.string(),
  version: z.number(),
  /** draft, sent, accepted, rejected, superseded, expired */
  status: z.string(),
  yacht: yachtRef,
  slot_type_id: nullableString,
  slot_type_name: z.string(),
  date: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  guests: z.number(),
  inclusions: z.array(z.string()),
  /** A note to the customer. */
  message: nullableString,
  terms: nullableString,
  /** As last saved or sent; re-checked when accepted and at checkout. */
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
  expires_at: nullableString,
  sent_at: nullableString,
  decided_at: nullableString,
  decision_comment: nullableString,
  /** The checkout started when it was accepted. */
  checkout_session_id: nullableString,
  created_at: z.string(),
});
export type Proposal = z.infer<typeof proposalSchema>;

/** EnquiryDetailDto */
export const enquiryDetailSchema = enquirySchema.extend({
  /** Every version, newest first. */
  proposals: z.array(proposalSchema),
  /** Staff changes to the enquiry and its proposals, oldest first. */
  history: z.array(
    z.object({ action: z.string(), actor_id: nullableString, created_at: z.string() }),
  ),
});
export type EnquiryDetail = z.infer<typeof enquiryDetailSchema>;

const listSchema = z.object({
  items: z.array(enquirySchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});

export const ENQUIRY_STATUSES = [
  "new",
  "in_progress",
  "proposal_sent",
  "accepted",
  "rejected",
  "closed",
] as const;

export interface EnquiryQuery {
  page?: number;
  /** 1–100 (default 20). */
  limit?: number;
  status?: (typeof ENQUIRY_STATUSES)[number];
  /** A staff member's id, "me" or "none". */
  assigned_to?: string;
  yacht_id?: string;
  /** Reference, name, email or phone. */
  search?: string;
  /** Received on or after (local date). */
  from?: string;
  to?: string;
}

/** UpdateEnquiryDto — only these statuses can be set by hand; the others follow the proposals. */
export interface EnquiryPatch {
  status?: "new" | "in_progress" | "closed";
  /** An active staff member; null unassigns. */
  assigned_to_id?: string | null;
}

/** CreateProposalDto */
export interface ProposalInput {
  yacht_id: string;
  /** A package of that yacht. */
  slot_type_id: string;
  /** Local date. */
  date: string;
  /** Any HH:mm within the charter and yacht hours. */
  start_time: string;
  guests: number;
  addons?: { addon_id: string; quantity: number }[];
  inclusions?: string[];
  /** A note to the customer (4,000 characters). */
  message?: string;
  /** 10,000 characters. */
  terms?: string;
  /** With an offset; left out: 7 days after it is sent; at most 90 days ahead. */
  expires_at?: string;
}

/** UpdateProposalDto (drafts only); null clears message, terms or expires_at. */
export type ProposalPatch = Partial<Omit<ProposalInput, "message" | "terms" | "expires_at">> & {
  message?: string | null;
  terms?: string | null;
  expires_at?: string | null;
};

const enquiry = (id: string) => `/admin/enquiries/${encodeURIComponent(id)}`;
const proposal = (id: string) => `/admin/proposals/${encodeURIComponent(id)}`;

/** GET /admin/enquiries */
export function listEnquiries(query: EnquiryQuery = {}, signal?: AbortSignal) {
  return adminApiClient.get("/admin/enquiries", {
    query: { ...query },
    schema: listSchema,
    signal,
  });
}

/** GET /admin/enquiries/{id} — with every proposal version and the history. */
export function getEnquiry(id: string, signal?: AbortSignal): Promise<EnquiryDetail> {
  return adminApiClient.get(enquiry(id), { schema: enquiryDetailSchema, signal });
}

/** PATCH /admin/enquiries/{id} — stage and assignee. 400 INVALID_ENQUIRY_UPDATE. */
export function updateEnquiry(id: string, patch: EnquiryPatch): Promise<Enquiry> {
  return adminApiClient.patch(enquiry(id), { body: patch, schema: enquirySchema });
}

/** POST /admin/enquiries/{id}/proposals (201) — a new draft. */
export function createProposal(enquiryId: string, input: ProposalInput): Promise<Proposal> {
  return adminApiClient.post(`${enquiry(enquiryId)}/proposals`, {
    body: input,
    schema: proposalSchema,
  });
}

/** GET /admin/proposals/{id} */
export function getProposal(id: string, signal?: AbortSignal): Promise<Proposal> {
  return adminApiClient.get(proposal(id), { schema: proposalSchema, signal });
}

/** PATCH /admin/proposals/{id} — drafts only (409 PROPOSAL_NOT_DRAFT). */
export function updateProposal(id: string, patch: ProposalPatch): Promise<Proposal> {
  return adminApiClient.patch(proposal(id), { body: patch, schema: proposalSchema });
}

/** POST /admin/proposals/{id}/publish — sends the draft to the customer. */
export function publishProposal(id: string): Promise<Proposal> {
  return adminApiClient.post(`${proposal(id)}/publish`, { schema: proposalSchema });
}

/** POST /admin/proposals/{id}/revise (201) — a new draft version from a sent one. */
export function reviseProposal(id: string): Promise<Proposal> {
  return adminApiClient.post(`${proposal(id)}/revise`, { schema: proposalSchema });
}
