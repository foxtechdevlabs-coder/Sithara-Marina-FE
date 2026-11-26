import {
  fleetErrorMessage,
  isPhotoUploadDown,
} from "@/features/admin/fleet/utils/fleet-error-message";
import type {
  GuestVideo,
  GuestVideoInput,
  GuestVideoPatch,
} from "@/services/admin/guest-videos.service";
import { UPLOAD_REFUSED } from "@/services/admin/media.service";
import { isApiError } from "@/services/http/api-error";

/* The guest video form: its fields, checks, and the request bodies. */

export const TITLE_MAX = 200;
export const DESCRIPTION_MAX = 2000;
export const LOCATION_MAX = 200;

export interface GuestVideoDraft {
  title: string;
  description: string;
  location: string;
  /** Display order, as typed. */
  order: string;
  /** The video to save; null for none. */
  mediaId: string | null;
}

export const emptyGuestVideoDraft: GuestVideoDraft = {
  title: "",
  description: "",
  location: "",
  order: "0",
  mediaId: null,
};

export const draftFromGuestVideo = (v: GuestVideo): GuestVideoDraft => ({
  title: v.title,
  description: v.description ?? "",
  location: v.location ?? "",
  order: String(v.sort_order),
  mediaId: v.media_id,
});

export const NEEDS_VIDEO = "Upload a video to publish. You can save it as a draft without one.";

/** Field errors for saving as a draft (`publish` false) or published. Keys are field names. */
export function guestVideoErrors(
  d: GuestVideoDraft,
  publish: boolean,
): Partial<Record<keyof GuestVideoDraft, string>> {
  const errors: Partial<Record<keyof GuestVideoDraft, string>> = {};
  if (!d.title.trim()) errors.title = "Enter a title.";
  else if (d.title.trim().length > TITLE_MAX) errors.title = `Keep it to ${TITLE_MAX} characters.`;
  if (d.description.trim().length > DESCRIPTION_MAX)
    errors.description = `Keep it to ${DESCRIPTION_MAX} characters.`;
  if (d.location.trim().length > LOCATION_MAX)
    errors.location = `Keep it to ${LOCATION_MAX} characters.`;
  if (!/^\d{1,4}$/.test(d.order.trim())) errors.order = "Enter a whole number from 0 to 9999.";
  if (publish && !d.mediaId) errors.mediaId = NEEDS_VIDEO;
  return errors;
}

/** POST /admin/guest-videos body. */
export function guestVideoInput(d: GuestVideoDraft, publish: boolean): GuestVideoInput {
  return {
    title: d.title.trim(),
    description: d.description.trim() || null,
    location: d.location.trim() || null,
    media_id: d.mediaId,
    is_published: publish,
    sort_order: Number(d.order.trim()),
  };
}

/**
 * PATCH body: only what differs from the saved video. Emptied text and a removed
 * video are sent as null; an unchanged video's `media_id` is never sent again.
 */
export function guestVideoPatch(
  saved: GuestVideo,
  d: GuestVideoDraft,
  publish: boolean,
): GuestVideoPatch {
  const next = guestVideoInput(d, publish);
  const patch: GuestVideoPatch = {};
  if (next.title !== saved.title) patch.title = next.title;
  if (next.description !== saved.description) patch.description = next.description;
  if (next.location !== saved.location) patch.location = next.location;
  if (next.media_id !== saved.media_id) patch.media_id = next.media_id;
  if (next.is_published !== saved.is_published) patch.is_published = next.is_published;
  if (next.sort_order !== saved.sort_order) patch.sort_order = next.sort_order;
  return patch;
}

/** "12.4 MB" */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** For a failed upload (POST /admin/media/uploads, then the PUT to storage). */
export function guestVideoUploadMessage(error: unknown): string {
  if (isApiError(error) && error.code === UPLOAD_REFUSED)
    return "The upload link expired or was refused before the video finished uploading. Choose the video again.";
  if (isPhotoUploadDown(error)) return "Video upload isn’t available right now. Try again later.";
  return guestVideoErrorMessage(error);
}

/** A short message for a failed guest video request. */
export function guestVideoErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.code === "INCOMPLETE_CONTENT") return NEEDS_VIDEO;
    if (error.code === "INVALID_MEDIA")
      return "The video wasn’t accepted. Upload an MP4 or WebM video of up to 100 MB again.";
    if (error.status === 403) return "Your account doesn’t have permission to manage guest videos.";
    if (error.status === 404) return "This guest video no longer exists. It may have been deleted.";
  }
  return fleetErrorMessage(error, "This guest video");
}
