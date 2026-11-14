import { z } from "zod";

import { apiClient } from "@/services/http/api-client";

import { adminApiClient } from "./admin-api-client";

/*
 * A yacht's 360° view (backend: /admin/yachts/{id}/spin, needs yachts:write).
 * A video uploaded with purpose `yacht_spin_video` is attached, the backend
 * cuts it into frames in the background, and the result goes live. A new video
 * is processed beside the live view, which stays up until the new one is ready.
 */

/** SpinLiveDto */
const liveSchema = z.object({
  id: z.string(),
  frame_count: z.number(),
  /** 1-based, in video order. */
  first_frame: z.number(),
  reverse: z.boolean(),
  processed_at: z.string(),
  /** Small frames, in display order. */
  preview_frames: z.array(z.string()),
});

/** SpinAttemptDto */
const attemptSchema = z.object({
  id: z.string(),
  /** pending, processing, failed */
  status: z.string(),
  frame_count: z.number(),
  /** Why it failed; a new video starts again. */
  error: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

/** YachtSpinStatusDto */
export const spinStatusSchema = z.object({
  /** A 360° view is live on the website. */
  has_spin: z.boolean(),
  live: liveSchema.nullable(),
  /** The latest video not yet live: waiting, processing or failed. */
  attempt: attemptSchema.nullable(),
});
export type SpinStatus = z.infer<typeof spinStatusSchema>;
export type SpinLive = z.infer<typeof liveSchema>;

export const SPIN_FRAMES_MIN = 36;
export const SPIN_FRAMES_MAX = 72;
export const SPIN_FRAMES_DEFAULT = 36;
/** Videos the backend accepts are 2–60 seconds long. */
export const SPIN_SECONDS_MIN = 2;
export const SPIN_SECONDS_MAX = 60;

const path = (id: string) => `/admin/yachts/${encodeURIComponent(id)}/spin`;

/** GET /admin/yachts/{id}/spin */
export function getYachtSpin(yachtId: string, signal?: AbortSignal) {
  return adminApiClient.get(path(yachtId), { schema: spinStatusSchema, signal });
}

/**
 * PUT /admin/yachts/{id}/spin (202) — starts processing an uploaded video.
 * 400 INVALID_MEDIA: not a 360° upload, not a real video, or already attached.
 */
export function attachYachtSpin(
  yachtId: string,
  mediaId: string,
  frameCount = SPIN_FRAMES_DEFAULT,
) {
  return adminApiClient.put(path(yachtId), {
    body: { media_id: mediaId, frame_count: frameCount },
    schema: spinStatusSchema,
  });
}

/** PATCH /admin/yachts/{id}/spin — the starting frame and direction of the live view. */
export function updateYachtSpin(
  yachtId: string,
  change: { first_frame?: number; reverse?: boolean },
) {
  return adminApiClient.patch(path(yachtId), { body: change, schema: spinStatusSchema });
}

/** DELETE /admin/yachts/{id}/spin (204) — 404 SPIN_NOT_FOUND when nothing is live. */
export async function deleteYachtSpin(yachtId: string): Promise<void> {
  await adminApiClient.delete(path(yachtId));
}

/** PublicSpinDto — signed frame links (valid about an hour), in display order. */
export const publicSpinSchema = z.object({
  frame_count: z.number(),
  size: z.string(),
  width: z.number(),
  frames: z.array(z.object({ index: z.number(), url: z.string() })),
});
export type PublicSpin = z.infer<typeof publicSpinSchema>;

/**
 * GET /yachts/{slug}/spin?size=large|small — what the website shows. 404
 * YACHT_NOT_FOUND for a hidden or inactive yacht, SPIN_NOT_FOUND with no live view.
 */
export function getPublicYachtSpin(slug: string, size: "large" | "small", signal?: AbortSignal) {
  return apiClient.get(`/yachts/${encodeURIComponent(slug)}/spin`, {
    query: { size },
    auth: false,
    schema: publicSpinSchema,
    signal,
  });
}
