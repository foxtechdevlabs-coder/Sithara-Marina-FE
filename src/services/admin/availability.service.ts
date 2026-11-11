import { z } from "zod";

import { adminApiClient } from "./admin-api-client";

/* Admin availability: the fleet calendar and availability blocks. */

/** Block reasons the backend accepts. */
export const BLOCK_REASONS = [
  "maintenance",
  "private_use",
  "weather",
  "partner_unavailable",
  "other",
] as const;
export type BlockReason = (typeof BLOCK_REASONS)[number];

/** AvailabilityBlockResponseDto. `reason` is read as a string so a new value doesn't fail the page. */
export const availabilityBlockSchema = z.object({
  id: z.string(),
  yacht: z.object({ id: z.string(), name: z.string() }),
  starts_at: z.string(),
  ends_at: z.string(),
  reason: z.string(),
  note: z.string().nullable(),
  created_by_id: z.string().nullable().optional(),
  /** Set on blocks created together by POST /admin/availability-blocks/bulk. */
  batch_id: z.string().nullable().optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});
export type AvailabilityBlock = z.infer<typeof availabilityBlockSchema>;

const blockListSchema = z.object({
  items: z.array(availabilityBlockSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});
export type AvailabilityBlockList = z.infer<typeof blockListSchema>;

/** Query of GET /admin/availability-blocks. `from`/`to` are instants with an offset. */
export interface BlockListQuery {
  page?: number;
  /** 1–100 (default 20). */
  limit?: number;
  yacht_id?: string;
  /** Blocks ending after this. */
  from?: string;
  /** Blocks starting before this. */
  to?: string;
  reason?: BlockReason;
}

/** CreateAvailabilityBlockDto. `ends_at` is exclusive and must be in the future. */
export interface BlockInput {
  yacht_id: string;
  starts_at: string;
  ends_at: string;
  reason: BlockReason;
  note?: string | null;
}
/** UpdateAvailabilityBlockDto: the yacht can't change; `note: null` clears it. */
export type BlockPatch = Partial<Omit<BlockInput, "yacht_id">>;

const blockPath = (id: string) => `/admin/availability-blocks/${encodeURIComponent(id)}`;

/** GET /admin/availability-blocks (bookings:read). */
export function listAvailabilityBlocks(
  query: BlockListQuery = {},
  signal?: AbortSignal,
): Promise<AvailabilityBlockList> {
  return adminApiClient.get("/admin/availability-blocks", {
    query: { ...query },
    schema: blockListSchema,
    signal,
  });
}

/**
 * The block with this id. There is no single-block endpoint, so this pages
 * through the list; null when it no longer exists.
 */
export async function findAvailabilityBlock(
  id: string,
  signal?: AbortSignal,
): Promise<AvailabilityBlock | null> {
  for (let page = 1; page <= 20; page++) {
    const list = await listAvailabilityBlocks({ page, limit: 100 }, signal);
    const found = list.items.find((b) => b.id === id);
    if (found) return found;
    if (page * list.limit >= list.total) break;
  }
  return null;
}

/** POST /admin/availability-blocks. 409 BLOCK_CONFLICT when a booking or live hold is in the way. */
export function createAvailabilityBlock(input: BlockInput): Promise<AvailabilityBlock> {
  return adminApiClient.post("/admin/availability-blocks", {
    body: input,
    schema: availabilityBlockSchema,
  });
}

/** PATCH /admin/availability-blocks/{id} */
export function updateAvailabilityBlock(id: string, patch: BlockPatch): Promise<AvailabilityBlock> {
  return adminApiClient.patch(blockPath(id), { body: patch, schema: availabilityBlockSchema });
}

/** DELETE /admin/availability-blocks/{id} — the time becomes bookable again. */
export async function deleteAvailabilityBlock(id: string): Promise<void> {
  await adminApiClient.delete(blockPath(id));
}

/* ---------- Bulk blocks ---------- */

/** BulkAvailabilityBlocksDto: send `yacht_ids` (1–100) or `all_active: true`. */
export interface BulkBlockInput {
  yacht_ids?: string[];
  all_active?: boolean;
  starts_at: string;
  /** Exclusive; after starts_at and in the future. */
  ends_at: string;
  reason: BlockReason;
  note?: string | null;
  /** false: any conflict refuses the whole request (409). true: block the free yachts, list the others. */
  skip_conflicts?: boolean;
}

/** BlockConflictDto — a yacht that can't be blocked in the period. */
export const blockConflictSchema = z.object({
  yacht_id: z.string(),
  yacht_name: z.string(),
  /** Confirmed or unpaid-but-live bookings in the period. */
  booking_references: z.array(z.string()),
  /** A customer is checking out in the period (a live 10-minute hold). */
  checkout_in_progress: z.boolean(),
});
export type BlockConflict = z.infer<typeof blockConflictSchema>;

const bulkBlocksResultSchema = z.object({
  /** Null when every yacht was skipped. */
  batch_id: z.string().nullable(),
  blocks: z.array(availabilityBlockSchema),
  skipped: z.array(blockConflictSchema),
});
export type BulkBlocksResult = z.infer<typeof bulkBlocksResultSchema>;

/** POST /admin/availability-blocks/bulk (201). 409 BLOCK_CONFLICT with details.conflicts. */
export function createBulkBlocks(input: BulkBlockInput): Promise<BulkBlocksResult> {
  return adminApiClient.post("/admin/availability-blocks/bulk", {
    body: input,
    schema: bulkBlocksResultSchema,
  });
}

/** The conflicts of a 409 BLOCK_CONFLICT from the bulk endpoint, or [] when it has none. */
export function bulkConflicts(body: unknown): BlockConflict[] {
  const b = body as { details?: { conflicts?: unknown }; conflicts?: unknown } | null;
  const raw = b?.details?.conflicts ?? b?.conflicts;
  const parsed = z.array(blockConflictSchema).safeParse(raw);
  return parsed.success ? parsed.data : [];
}

/** DELETE /admin/availability-blocks/batches/{batchId} (204) — removes every block of a bulk block. */
export async function deleteBlockBatch(batchId: string): Promise<void> {
  await adminApiClient.delete(`/admin/availability-blocks/batches/${encodeURIComponent(batchId)}`);
}

/* ---------- Calendar ---------- */

const calendarBookingSchema = z.object({
  id: z.string(),
  reference: z.string(),
  status: z.string(),
  starts_at: z.string(),
  ends_at: z.string(),
  date: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  slot_type_name: z.string().nullable(),
  contact_name: z.string(),
  guest_count: z.number(),
  payment_due_by: z.string().nullable(),
});
export type CalendarBooking = z.infer<typeof calendarBookingSchema>;

const calendarHoldSchema = z.object({
  id: z.string(),
  starts_at: z.string(),
  ends_at: z.string(),
  date: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  expires_at: z.string(),
});
export type CalendarHold = z.infer<typeof calendarHoldSchema>;

const calendarBlockSchema = z.object({
  id: z.string(),
  starts_at: z.string(),
  ends_at: z.string(),
  reason: z.string(),
  note: z.string().nullable(),
});
export type CalendarBlock = z.infer<typeof calendarBlockSchema>;

const calendarWindowSchema = z.object({
  date: z.string(),
  slot_type_id: z.string(),
  slot_type_name: z.string(),
  start_time: z.string(),
  end_time: z.string(),
  starts_at: z.string(),
  ends_at: z.string(),
  /** Paise before GST. */
  price: z.number(),
});
export type CalendarWindow = z.infer<typeof calendarWindowSchema>;

const calendarYachtSchema = z.object({
  id: z.string(),
  name: z.string(),
  is_active: z.boolean(),
  turnaround_minutes: z.number(),
  bookings: z.array(calendarBookingSchema),
  holds: z.array(calendarHoldSchema),
  blocks: z.array(calendarBlockSchema),
  free_windows: z.array(calendarWindowSchema),
});
export type CalendarYacht = z.infer<typeof calendarYachtSchema>;

const calendarSchema = z.object({
  from: z.string(),
  to: z.string(),
  timezone: z.string(),
  yachts: z.array(calendarYachtSchema),
});

export interface YachtAvailability {
  timezone: string;
  yacht: CalendarYacht | null;
}

/** The longest range GET /admin/calendar accepts, in days. */
export const CALENDAR_MAX_DAYS = 42;

/**
 * GET /admin/calendar for one yacht (active or not), local dates `from`–`to`
 * inclusive, at most 42 days. Needs bookings:read.
 */
export async function getYachtAvailability(
  yachtId: string,
  from: string,
  to: string,
  signal?: AbortSignal,
): Promise<YachtAvailability> {
  const calendar = await adminApiClient.get("/admin/calendar", {
    query: { yacht_id: yachtId, from, to, include_inactive: true },
    schema: calendarSchema,
    signal,
  });
  return {
    timezone: calendar.timezone,
    yacht: calendar.yachts.find((y) => y.id === yachtId) ?? null,
  };
}
