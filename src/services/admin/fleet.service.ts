import { z } from "zod";

import { adminApiClient } from "./admin-api-client";

/*
 * Admin yacht management (backend: /admin/yachts/*). Request and response
 * shapes follow the backend OpenAPI document (GET /docs-json). Every call
 * needs the admin session; `adminApiClient` adds the Bearer token and
 * refreshes it when needed.
 */

const nullableString = z.string().nullable();
const nullableNumber = z.number().nullable();

export const OWNERSHIP_TYPES = ["own", "partner"] as const;
export type Ownership = (typeof OWNERSHIP_TYPES)[number];
export const BOOKING_MODES = ["instant", "enquiry_only"] as const;
export type BookingMode = (typeof BOOKING_MODES)[number];

/** CrewMemberResponseDto */
export const crewMemberSchema = z.object({
  name: z.string(),
  role: z.string(),
  bio: z.string().optional(),
});
export type CrewMember = z.infer<typeof crewMemberSchema>;

/** YachtResponseDto */
export const yachtSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  ownership_type: z.enum(OWNERSHIP_TYPES),
  partner: z.object({ id: z.string(), name: z.string() }).nullable(),
  /** Percentage; partner yachts only. */
  commission_rate: nullableNumber,
  type: nullableString,
  length_ft: nullableNumber,
  capacity: z.number(),
  suites: nullableNumber,
  description: nullableString,
  departure_city: nullableString,
  departure_points: z.array(z.string()),
  amenities: z.array(z.string()),
  inclusions: z.array(z.string()),
  crew: z.array(crewMemberSchema),
  policies: nullableString,
  booking_mode: z.enum(BOOKING_MODES),
  enquiry_enabled: z.boolean(),
  /** HH:mm local; set through PUT /slot-types. */
  opens_at: nullableString,
  closes_at: nullableString,
  turnaround_minutes: z.number(),
  is_active: z.boolean(),
  is_visible: z.boolean(),
  is_featured: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Yacht = z.infer<typeof yachtSchema>;

/** YachtPhotoResponseDto */
export const yachtPhotoSchema = z.object({
  id: z.string(),
  media_id: z.string(),
  url: z.string(),
  sort_order: z.number(),
});
export type YachtPhoto = z.infer<typeof yachtPhotoSchema>;

/** YachtDetailResponseDto */
export const yachtDetailSchema = yachtSchema.extend({ photos: z.array(yachtPhotoSchema) });
export type YachtDetail = z.infer<typeof yachtDetailSchema>;

/** AffectedBookingDto — future bookings a deactivated yacht still has. */
export const affectedBookingSchema = z.object({
  id: z.string(),
  reference: z.string(),
  starts_at: z.string(),
  ends_at: z.string(),
  status: z.string(),
});
export type AffectedBooking = z.infer<typeof affectedBookingSchema>;

const deactivatedSchema = yachtSchema.extend({
  affected_bookings: z.array(affectedBookingSchema),
});

const yachtListSchema = z.object({
  items: z.array(yachtSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});
export type YachtList = z.infer<typeof yachtListSchema>;

/** Query of GET /admin/yachts. `limit` is 1–100 (default 20). */
export interface YachtListQuery {
  page?: number;
  limit?: number;
  ownership?: Ownership;
  status?: "active" | "inactive";
  visibility?: "visible" | "hidden";
  /** Matches name or slug. */
  search?: string;
}

/** Fields of CreateYachtDto / UpdateYachtDto. Nullable ones accept null to clear. */
export interface YachtInput {
  name: string;
  slug?: string;
  ownership_type: Ownership;
  /** Required for partner yachts, not allowed for own yachts. */
  partner_id?: string | null;
  capacity: number;
  type?: string | null;
  length_ft?: number | null;
  suites?: number | null;
  description?: string | null;
  departure_city?: string | null;
  departure_points?: string[];
  amenities?: string[];
  inclusions?: string[];
  policies?: string | null;
  booking_mode?: BookingMode;
  enquiry_enabled?: boolean;
  is_featured?: boolean;
  /** New yachts must start hidden (409 NOT_PUBLISHABLE otherwise). */
  is_visible?: boolean;
}
/** UpdateYachtDto: any field of create (partial update). */
export type YachtPatch = Partial<YachtInput>;

const path = (id: string) => `/admin/yachts/${encodeURIComponent(id)}`;

/** GET /admin/yachts */
export function listYachts(query: YachtListQuery = {}, signal?: AbortSignal): Promise<YachtList> {
  return adminApiClient.get("/admin/yachts", {
    query: { ...query },
    schema: yachtListSchema,
    signal,
  });
}

/** GET /admin/yachts/{id} — the yacht with its photos. */
export function getYacht(id: string, signal?: AbortSignal): Promise<YachtDetail> {
  return adminApiClient.get(path(id), { schema: yachtDetailSchema, signal });
}

/** POST /admin/yachts (201) */
export function createYacht(input: YachtInput): Promise<Yacht> {
  return adminApiClient.post("/admin/yachts", { body: input, schema: yachtSchema });
}

/** PATCH /admin/yachts/{id} — send only the fields that changed. */
export function updateYacht(id: string, patch: YachtPatch): Promise<Yacht> {
  return adminApiClient.patch(path(id), { body: patch, schema: yachtSchema });
}

/** POST /admin/yachts/{id}/activate — 409 NOT_PUBLISHABLE if a visible yacht is incomplete. */
export function activateYacht(id: string): Promise<Yacht> {
  return adminApiClient.post(`${path(id)}/activate`, { schema: yachtSchema });
}

/**
 * POST /admin/yachts/{id}/deactivate — stops new bookings. The response lists
 * the future bookings the yacht still has; they stay valid and need follow-up.
 */
export function deactivateYacht(
  id: string,
): Promise<Yacht & { affected_bookings: AffectedBooking[] }> {
  return adminApiClient.post(`${path(id)}/deactivate`, { schema: deactivatedSchema });
}

/** PUT /admin/yachts/{id}/crew — replaces the whole crew list (up to 50). */
export function replaceCrew(id: string, crew: CrewMember[]): Promise<Yacht> {
  return adminApiClient.put(`${path(id)}/crew`, { body: { crew }, schema: yachtSchema });
}

/**
 * PUT /admin/yachts/{id}/commission — partner yachts only. A percentage, or
 * null to remove the rate. Affects new bookings only.
 */
export function setCommission(id: string, commissionRate: number | null): Promise<Yacht> {
  return adminApiClient.put(`${path(id)}/commission`, {
    body: { commission_rate: commissionRate },
    schema: yachtSchema,
  });
}

/* Photos ------------------------------------------------------------ */

/** POST /admin/yachts/{id}/photos — attaches uploaded media (1–30), appended in this order. */
export function attachPhotos(id: string, mediaIds: string[]): Promise<YachtPhoto[]> {
  return adminApiClient.post(`${path(id)}/photos`, {
    body: { media_ids: mediaIds },
    schema: z.array(yachtPhotoSchema),
  });
}

/** PATCH /admin/yachts/{id}/photos/order — every photo id exactly once; the first is the cover. */
export function reorderPhotos(id: string, photoIds: string[]): Promise<YachtPhoto[]> {
  return adminApiClient.patch(`${path(id)}/photos/order`, {
    body: { photo_ids: photoIds },
    schema: z.array(yachtPhotoSchema),
  });
}

/** DELETE /admin/yachts/{id}/photos/{photoId} (204) */
export async function deletePhoto(id: string, photoId: string): Promise<void> {
  await adminApiClient.delete(`${path(id)}/photos/${encodeURIComponent(photoId)}`);
}

/* Slot types -------------------------------------------------------- */

/** SlotTypeResponseDto */
export const slotTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  duration_minutes: z.number(),
  start_times: z.array(z.string()),
  sort_order: z.number(),
  is_active: z.boolean(),
});
export type SlotType = z.infer<typeof slotTypeSchema>;

/** SlotTypesResponseDto — the yacht's operating hours and slot types. */
export const slotSetupSchema = z.object({
  opens_at: nullableString,
  closes_at: nullableString,
  turnaround_minutes: z.number(),
  slot_types: z.array(slotTypeSchema),
});
export type SlotSetup = z.infer<typeof slotSetupSchema>;

/** ReplaceSlotTypesDto */
export interface SlotSetupInput {
  opens_at: string;
  closes_at: string;
  turnaround_minutes: number;
  /**
   * In display order. Include `id` to keep an existing slot type (and its
   * price rules); slot types left out are deleted with their price rules.
   */
  slot_types: {
    id?: string;
    name: string;
    duration_minutes: number;
    start_times: string[];
    is_active?: boolean;
  }[];
}

/** GET /admin/yachts/{id}/slot-types */
export function getSlotTypes(id: string, signal?: AbortSignal): Promise<SlotSetup> {
  return adminApiClient.get(`${path(id)}/slot-types`, { schema: slotSetupSchema, signal });
}

/** PUT /admin/yachts/{id}/slot-types — replaces the whole slot setup. */
export function replaceSlotTypes(id: string, input: SlotSetupInput): Promise<SlotSetup> {
  return adminApiClient.put(`${path(id)}/slot-types`, { body: input, schema: slotSetupSchema });
}

/* Partners (for choosing a partner yacht's owner) -------------------- */

const partnerSchema = z.object({ id: z.string(), name: z.string(), is_active: z.boolean() });
export type PartnerOption = z.infer<typeof partnerSchema>;

/** GET /admin/partners?status=active — needs the partners:read permission. */
export async function listActivePartners(signal?: AbortSignal): Promise<PartnerOption[]> {
  const { items } = await adminApiClient.get("/admin/partners", {
    query: { status: "active", limit: 100 },
    schema: z.object({ items: z.array(partnerSchema) }),
    signal,
  });
  return items;
}
