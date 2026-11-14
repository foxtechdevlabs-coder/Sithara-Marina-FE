import { z } from "zod";

import { apiClient } from "@/services/http/api-client";

/*
 * Public yacht catalogue. Contract: the backend's Swagger docs at
 * `<NEXT_PUBLIC_API_BASE_URL>/docs`. Every call is a public GET.
 *
 * Money is in minor units (paise), excluding GST: format it for display with
 * `formatMinorUnits()`, and send it back unchanged. Many fields are nullable.
 */

/** The hosted backend can take ~40 s to wake from idle (Render). */
const PUBLIC = { auth: false, timeoutMs: 60_000 } as const;

const yachtPath = (slug: string) => `/yachts/${encodeURIComponent(slug)}`;

/**
 * Opt-in server reuse (Next.js data cache; ignored in the browser) for catalogue
 * content only: names, photos, descriptions, starting prices. Never for anything
 * that says whether a date or time can be booked (calendar, slots, quotes).
 */
export interface CatalogueCache {
  /** Seconds an answer may be reused. Photo links stay valid for an hour. */
  revalidate: number;
}
const cacheInit = (cache?: CatalogueCache) =>
  cache ? { init: { next: { revalidate: cache.revalidate } } } : {};

/** Error codes documented for these endpoints. */
export type YachtErrorCode =
  | "INVALID_FILTER"
  | "YACHT_NOT_FOUND"
  | "INVALID_SLOT_TYPE"
  | "GUESTS_EXCEED_CAPACITY";

const bookingModeSchema = z.enum(["instant", "enquiry_only"]);
const dayStatusSchema = z.enum(["available", "partly_available", "unavailable", "past"]);
export type DayStatus = z.infer<typeof dayStatusSchema>;

// ── Listing ─────────────────────────────────────────────────────────────────

const yachtCardSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  type: z.string().nullable(),
  length_ft: z.number().nullable(),
  suites: z.number().nullable(),
  capacity: z.number(),
  departure_city: z.string().nullable(),
  card_tagline: z.string().nullable(),
  cruising_regions: z.array(z.string()),
  primary_image_url: z.string().nullable(),
  /** Paise, excluding GST. */
  starting_price: z.number().nullable(),
  currency: z.string(),
  /** Null when no `date` was asked for. */
  available_on_date: z.boolean().nullable(),
  booking_mode: bookingModeSchema,
  enquiry_enabled: z.boolean(),
});
export type YachtCard = z.infer<typeof yachtCardSchema>;

const yachtListSchema = z.object({
  items: z.array(yachtCardSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});
export type YachtList = z.infer<typeof yachtListSchema>;

export type YachtSort = "price_asc" | "price_desc" | "capacity_asc" | "capacity_desc";

export interface ListYachtsParams {
  page?: number;
  /** At most 100. */
  limit?: number;
  /** YYYY-MM-DD. Fills `available_on_date`; it never removes a yacht. */
  date?: string;
  guests?: number;
  type?: string;
  min_length_ft?: number;
  max_length_ft?: number;
  min_suites?: number;
  /** Paise, excluding GST. */
  min_price?: number;
  /** Paise, excluding GST. */
  max_price?: number;
  destination?: string;
  sort?: YachtSort;
}

/** GET /yachts. 400 `INVALID_FILTER`: past or beyond-horizon date, or min above max price. */
export function listYachts(
  params: ListYachtsParams = {},
  signal?: AbortSignal,
  cache?: CatalogueCache,
): Promise<YachtList> {
  return apiClient.get("/yachts", {
    ...PUBLIC,
    query: { ...params },
    signal,
    schema: yachtListSchema,
    ...cacheInit(cache),
  });
}

// ── Filter options ──────────────────────────────────────────────────────────

const rangeSchema = z.object({ min: z.number().nullable(), max: z.number().nullable() });

const yachtFiltersSchema = z.object({
  types: z.array(z.string()),
  destinations: z.array(z.string()),
  length_ft: rangeSchema,
  suites: z.array(z.number()),
  /** Paise, excluding GST. */
  price: rangeSchema,
  currency: z.string(),
});
export type YachtFilterOptions = z.infer<typeof yachtFiltersSchema>;

/**
 * GET /yachts/filters. Only the catalogue's facets (types, cities, ranges), never
 * availability, so the server may reuse an answer for 5 minutes (Next.js data
 * cache; ignored in the browser). Lists, slots, quotes and bookings stay uncached.
 */
export function getYachtFilters(signal?: AbortSignal): Promise<YachtFilterOptions> {
  return apiClient.get("/yachts/filters", {
    ...PUBLIC,
    signal,
    schema: yachtFiltersSchema,
    init: { next: { revalidate: 300 } },
  });
}

// ── Details ─────────────────────────────────────────────────────────────────

const slotTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  duration_minutes: z.number(),
  start_times: z.array(z.string()),
});
export type YachtSlotType = z.infer<typeof slotTypeSchema>;

const yachtDetailSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  type: z.string().nullable(),
  length_ft: z.number().nullable(),
  capacity: z.number(),
  suites: z.number().nullable(),
  description: z.string().nullable(),
  departure_city: z.string().nullable(),
  card_tagline: z.string().nullable(),
  cruising_regions: z.array(z.string()),
  built_year: z.number().nullable(),
  refit_year: z.number().nullable(),
  cruising_speed_kmh: z.number().nullable(),
  departure_points: z.array(z.string()),
  amenities: z.array(z.string()),
  inclusions: z.array(z.string()),
  crew: z.array(
    z.object({ name: z.string(), role: z.string(), bio: z.string().nullable() }),
  ),
  policies: z.string().nullable(),
  photos: z.array(z.object({ url: z.string(), sort_order: z.number() })),
  opens_at: z.string().nullable(),
  closes_at: z.string().nullable(),
  /** Paise, excluding GST. */
  starting_price: z.number().nullable(),
  currency: z.string(),
  booking_mode: bookingModeSchema,
  enquiry_enabled: z.boolean(),
  slot_types: z.array(slotTypeSchema),
  /** A 360° view is ready: GET /yachts/{slug}/spin. */
  has_spin: z.boolean().default(false),
});
export type YachtDetail = z.infer<typeof yachtDetailSchema>;

/**
 * GET /yachts/{slug}. 404 `YACHT_NOT_FOUND` for unknown, inactive and hidden
 * yachts. A 200 says nothing about availability: use the calendar and slots.
 */
export function getYacht(
  slug: string,
  signal?: AbortSignal,
  cache?: CatalogueCache,
): Promise<YachtDetail> {
  return apiClient.get(yachtPath(slug), {
    ...PUBLIC,
    signal,
    schema: yachtDetailSchema,
    ...cacheInit(cache),
  });
}

// ── Calendar ────────────────────────────────────────────────────────────────

const calendarSchema = z.object({
  month: z.string(),
  timezone: z.string(),
  days: z.array(z.object({ date: z.string(), status: dayStatusSchema })),
});
export type YachtCalendar = z.infer<typeof calendarSchema>;

export interface YachtCalendarParams {
  /** YYYY-MM. */
  month: string;
  slot_type_id?: string;
}

/** GET /yachts/{slug}/calendar. 400 `INVALID_SLOT_TYPE` · 404 `YACHT_NOT_FOUND`. */
export function getYachtCalendar(
  slug: string,
  params: YachtCalendarParams,
  signal?: AbortSignal,
): Promise<YachtCalendar> {
  return apiClient.get(`${yachtPath(slug)}/calendar`, {
    ...PUBLIC,
    query: { ...params },
    signal,
    schema: calendarSchema,
  });
}

// ── Slots ───────────────────────────────────────────────────────────────────

const slotSchema = z.object({
  slot_type_id: z.string(),
  slot_type_name: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  starts_at: z.string(),
  ends_at: z.string(),
  state: z.enum(["available", "booked", "held", "blocked", "past"]),
  /** Paise, excluding GST. Null: the slot cannot be booked, whatever its state. */
  price: z.number().nullable(),
  included_guests: z.number().nullable(),
  extra_guest_amount: z.number().nullable(),
});
export type YachtSlot = z.infer<typeof slotSchema>;

const slotsSchema = z.object({
  date: z.string(),
  timezone: z.string(),
  date_status: dayStatusSchema,
  currency: z.string(),
  slots: z.array(slotSchema),
});
export type YachtSlots = z.infer<typeof slotsSchema>;

export interface YachtSlotsParams {
  /** YYYY-MM-DD. */
  date: string;
  slot_type_id?: string;
  /** Adds extra-guest charges to each price. */
  guests?: number;
}

/**
 * GET /yachts/{slug}/slots. 400 `GUESTS_EXCEED_CAPACITY` / `INVALID_SLOT_TYPE`
 * · 404 `YACHT_NOT_FOUND`.
 */
export function getYachtSlots(
  slug: string,
  params: YachtSlotsParams,
  signal?: AbortSignal,
): Promise<YachtSlots> {
  return apiClient.get(`${yachtPath(slug)}/slots`, {
    ...PUBLIC,
    query: { ...params },
    signal,
    schema: slotsSchema,
  });
}

// ── Add-ons ─────────────────────────────────────────────────────────────────

const addonsSchema = z.object({
  currency: z.string(),
  items: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().nullable(),
      /** Paise, excluding GST. */
      price: z.number(),
      min_quantity: z.number(),
      max_quantity: z.number(),
    }),
  ),
});
export type YachtAddons = z.infer<typeof addonsSchema>;

/** GET /yachts/{slug}/addons. 404 `YACHT_NOT_FOUND`. */
export function getYachtAddons(slug: string, signal?: AbortSignal): Promise<YachtAddons> {
  return apiClient.get(`${yachtPath(slug)}/addons`, { ...PUBLIC, signal, schema: addonsSchema });
}

// ── 360° view ───────────────────────────────────────────────────────────────

const spinSchema = z.object({
  frame_count: z.number(),
  size: z.string(),
  width: z.number(),
  /** Signed links (valid about an hour), in display order: the first is the starting view. */
  frames: z.array(z.object({ index: z.number(), url: z.string() })),
});
export type YachtSpin = z.infer<typeof spinSchema>;

/**
 * GET /yachts/{slug}/spin?size=large|small. 404 `YACHT_NOT_FOUND` or
 * `SPIN_NOT_FOUND` when there's no 360° view to show.
 */
export function getYachtSpin(
  slug: string,
  size: "large" | "small",
  signal?: AbortSignal,
): Promise<YachtSpin> {
  return apiClient.get(`${yachtPath(slug)}/spin`, {
    ...PUBLIC,
    query: { size },
    signal,
    schema: spinSchema,
  });
}
