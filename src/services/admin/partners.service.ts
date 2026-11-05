import { z } from "zod";

import { yachtSchema, type Yacht } from "./fleet.service";
import { adminApiClient } from "./admin-api-client";

/*
 * Yacht-owner partners (backend: /admin/partners/*). Needs the partners:read
 * and partners:write permissions. Bank details are left out for now: they need
 * partners:bank, and the partner screens don't show them.
 */

/** PartnerResponseDto */
export const partnerSchema = z.object({
  id: z.string(),
  name: z.string(),
  contact_name: z.string().nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  /** Percentage. Yachts with no rate of their own use this one. */
  default_commission_rate: z.number().nullable(),
  /** First day of the agreement, YYYY-MM-DD. */
  agreement_effective_from: z.string().nullable(),
  /** Last day of the agreement, YYYY-MM-DD; not before agreement_effective_from. */
  agreement_valid_till: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Partner = z.infer<typeof partnerSchema>;

/** PartnerDocumentResponseDto */
export const partnerDocumentSchema = z.object({
  id: z.string(),
  media_id: z.string(),
  title: z.string(),
  filename: z.string(),
  /** Signed link, valid for one hour. */
  url: z.string(),
  created_at: z.string(),
});
export type PartnerDocument = z.infer<typeof partnerDocumentSchema>;

/** PartnerDetailResponseDto */
export const partnerDetailSchema = partnerSchema.extend({
  documents: z.array(partnerDocumentSchema),
});
export type PartnerDetail = z.infer<typeof partnerDetailSchema>;

const partnerListSchema = z.object({
  items: z.array(partnerSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});
export type PartnerList = z.infer<typeof partnerListSchema>;

/** Query of GET /admin/partners. `limit` is 1–100 (default 20). */
export interface PartnerListQuery {
  page?: number;
  limit?: number;
  status?: "active" | "inactive";
  /** Matches name, contact name or email. */
  search?: string;
}

/** CreatePartnerDto. Nullable fields accept null to clear. */
export interface PartnerInput {
  name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  default_commission_rate?: number | null;
  agreement_effective_from?: string | null;
  agreement_valid_till?: string | null;
}
/** UpdatePartnerDto: any field of create, plus `is_active`. */
export type PartnerPatch = Partial<PartnerInput> & { is_active?: boolean };

const path = (id: string) => `/admin/partners/${encodeURIComponent(id)}`;

/** GET /admin/partners — sorted by name. */
export function listPartners(
  query: PartnerListQuery = {},
  signal?: AbortSignal,
): Promise<PartnerList> {
  return adminApiClient.get("/admin/partners", {
    query: { ...query },
    schema: partnerListSchema,
    signal,
  });
}

/** GET /admin/partners/{id} — the partner with its documents. */
export function getPartner(id: string, signal?: AbortSignal): Promise<PartnerDetail> {
  return adminApiClient.get(path(id), { schema: partnerDetailSchema, signal });
}

/** POST /admin/partners (201) */
export function createPartner(input: PartnerInput): Promise<Partner> {
  return adminApiClient.post("/admin/partners", { body: input, schema: partnerSchema });
}

/** PATCH /admin/partners/{id} — send only the fields that changed. */
export function updatePartner(id: string, patch: PartnerPatch): Promise<Partner> {
  return adminApiClient.patch(path(id), { body: patch, schema: partnerSchema });
}

/** POST /admin/partners/{id}/documents (201) — attaches an uploaded file. */
export function attachPartnerDocument(
  id: string,
  input: { media_id: string; title: string },
): Promise<PartnerDocument> {
  return adminApiClient.post(`${path(id)}/documents`, {
    body: input,
    schema: partnerDocumentSchema,
  });
}

/** GET /admin/partners/{id}/yachts — sorted by name. */
export function listPartnerYachts(id: string, signal?: AbortSignal): Promise<Yacht[]> {
  return adminApiClient.get(`${path(id)}/yachts`, { schema: z.array(yachtSchema), signal });
}

/**
 * PUT /admin/partners/{id}/commission — a percentage, or null to remove the
 * rate. Affects new bookings only.
 */
export function setPartnerCommission(id: string, commissionRate: number | null): Promise<Partner> {
  return adminApiClient.put(`${path(id)}/commission`, {
    body: { commission_rate: commissionRate },
    schema: partnerSchema,
  });
}
