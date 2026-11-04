import { z } from "zod";

import { ApiError } from "@/services/http/api-error";

import { adminApiClient } from "./admin-api-client";

/*
 * Media uploads (backend: POST /admin/media/uploads). The file itself is not
 * sent to the API: the backend returns a signed storage link, the browser
 * PUTs the file there, and the returned `media_id` is then attached (e.g.
 * POST /admin/yachts/{id}/photos).
 */

/** What the backend accepts for yacht photos (media.rules.ts: yacht_photo). */
export const YACHT_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const YACHT_PHOTO_MAX_BYTES = 10 * 1024 * 1024;

/** Why this file can't be a yacht photo, or null. */
export function yachtPhotoProblem(file: File): string | null {
  if (!(YACHT_PHOTO_TYPES as readonly string[]).includes(file.type)) {
    return `${file.name} isn't a JPEG, PNG or WebP image.`;
  }
  if (file.size > YACHT_PHOTO_MAX_BYTES) return `${file.name} is larger than 10 MB.`;
  if (file.size === 0) return `${file.name} is empty.`;
  return null;
}

const uploadTicketSchema = z.object({
  media_id: z.string(),
  /** PUT the file here with the same content type. */
  upload_url: z.string(),
  expires_in: z.number(),
});

/** Sends the file to the signed link; reports progress from 0 to 1. */
function putFile(url: string, file: File, onProgress?: (fraction: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    // Content type and size are part of the signature; the browser sets the size.
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(
            new ApiError(`Upload failed (${xhr.status})`, { kind: "http", status: xhr.status }),
          );
    xhr.onerror = () => reject(new ApiError("Upload failed: network error", { kind: "network" }));
    xhr.send(file);
  });
}

/**
 * Uploads one yacht photo and returns its `media_id`, ready to attach.
 * POST /admin/media/uploads, then PUT to the signed `upload_url`.
 */
export async function uploadYachtPhoto(
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<string> {
  const ticket = await adminApiClient.post("/admin/media/uploads", {
    body: {
      purpose: "yacht_photo",
      filename: file.name.slice(0, 255),
      content_type: file.type,
      size_bytes: file.size,
    },
    schema: uploadTicketSchema,
  });
  await putFile(ticket.upload_url, file, onProgress);
  onProgress?.(1);
  return ticket.media_id;
}
