import { z } from "zod";

import { adminApiClient } from "./admin-api-client";

/*
 * Guest videos for the website's "Guests" section (backend: /admin/guest-videos;
 * needs cms:read / cms:write / cms:delete). The video itself is uploaded first
 * (POST /admin/media/uploads, purpose guest_video; see `uploadGuestVideo`) and
 * its `media_id` is saved here. Replacing or deleting a video deletes the old
 * file on the backend.
 */

/** GuestVideoResponseDto */
export const guestVideoSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  location: z.string().nullable(),
  media_id: z.string().nullable(),
  /** Signed link (about an hour). Null without a video, or if storage can't link it. */
  video_url: z.string().nullable(),
  video_content_type: z.string().nullable(),
  video_size_bytes: z.number().nullable(),
  /** As uploaded. */
  video_filename: z.string().nullable(),
  is_published: z.boolean(),
  /** Lowest shows first. */
  sort_order: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type GuestVideo = z.infer<typeof guestVideoSchema>;

const guestVideoListSchema = z.object({
  items: z.array(guestVideoSchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
});
export type GuestVideoList = z.infer<typeof guestVideoListSchema>;

/** CreateGuestVideoDto. A published video needs a `media_id` (400 INCOMPLETE_CONTENT). */
export interface GuestVideoInput {
  /** Up to 200 characters. */
  title: string;
  /** Up to 2000 characters. */
  description?: string | null;
  /** Up to 200 characters. */
  location?: string | null;
  /** From POST /admin/media/uploads (purpose guest_video). */
  media_id?: string | null;
  /** Backend default: false (a draft). */
  is_published?: boolean;
  sort_order?: number;
}

/** UpdateGuestVideoDto: only the fields that changed; null clears description, location or the video. */
export type GuestVideoPatch = Partial<GuestVideoInput>;

export interface GuestVideoQuery {
  page?: number;
  /** 1 to 100 (backend default 20). */
  limit?: number;
  status?: "published" | "draft";
}

/** GET /admin/guest-videos */
export function listGuestVideos(
  query: GuestVideoQuery = {},
  signal?: AbortSignal,
): Promise<GuestVideoList> {
  return adminApiClient.get("/admin/guest-videos", {
    query: { ...query },
    schema: guestVideoListSchema,
    signal,
  });
}

/** GET /admin/guest-videos/{id}. 404 when it no longer exists. */
export function getGuestVideo(id: string, signal?: AbortSignal): Promise<GuestVideo> {
  return adminApiClient.get(`/admin/guest-videos/${encodeURIComponent(id)}`, {
    schema: guestVideoSchema,
    signal,
  });
}

/** POST /admin/guest-videos (201). */
export function createGuestVideo(input: GuestVideoInput): Promise<GuestVideo> {
  return adminApiClient.post("/admin/guest-videos", { body: input, schema: guestVideoSchema });
}

/** PATCH /admin/guest-videos/{id}: changed fields only. */
export function updateGuestVideo(id: string, patch: GuestVideoPatch): Promise<GuestVideo> {
  return adminApiClient.patch(`/admin/guest-videos/${encodeURIComponent(id)}`, {
    body: patch,
    schema: guestVideoSchema,
  });
}

/** DELETE /admin/guest-videos/{id} (204). The backend deletes the video file too. */
export async function deleteGuestVideo(id: string): Promise<void> {
  await adminApiClient.delete(`/admin/guest-videos/${encodeURIComponent(id)}`);
}
