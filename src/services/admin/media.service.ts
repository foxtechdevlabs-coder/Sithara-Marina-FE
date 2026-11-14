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

/** What the backend accepts for partner documents (media.rules.ts: partner_document). */
export const PARTNER_DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;
export const PARTNER_DOCUMENT_MAX_BYTES = 20 * 1024 * 1024;

/** What the backend accepts for a 360° video (yacht_spin_video): MP4, MOV or WebM, up to 200 MB. */
export const SPIN_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"] as const;
export const SPIN_VIDEO_MAX_BYTES = 200 * 1024 * 1024;
const SPIN_VIDEO_EXTENSIONS: Record<string, (typeof SPIN_VIDEO_TYPES)[number]> = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
};

/** The video's type; from its extension when the browser leaves it blank (common for .mov on Windows). */
export function spinVideoType(file: File): string {
  if ((SPIN_VIDEO_TYPES as readonly string[]).includes(file.type)) return file.type;
  return SPIN_VIDEO_EXTENSIONS[file.name.split(".").pop()?.toLowerCase() ?? ""] ?? file.type;
}

/** Why this file can't be a 360° video, or null. Duration is checked separately. */
export function spinVideoProblem(file: File): string | null {
  if (!(SPIN_VIDEO_TYPES as readonly string[]).includes(spinVideoType(file))) {
    return `${file.name} isn't an MP4, MOV or WebM video.`;
  }
  if (file.size > SPIN_VIDEO_MAX_BYTES) return `${file.name} is larger than 200 MB.`;
  if (file.size === 0) return `${file.name} is empty.`;
  return null;
}

/** Why this file can't be a yacht photo, or null. */
export function yachtPhotoProblem(file: File): string | null {
  if (!(YACHT_PHOTO_TYPES as readonly string[]).includes(file.type)) {
    return `${file.name} isn't a JPEG, PNG or WebP image.`;
  }
  if (file.size > YACHT_PHOTO_MAX_BYTES) return `${file.name} is larger than 10 MB.`;
  if (file.size === 0) return `${file.name} is empty.`;
  return null;
}

/** Why this file can't be a partner document, or null. */
export function partnerDocumentProblem(file: File): string | null {
  if (!(PARTNER_DOCUMENT_TYPES as readonly string[]).includes(file.type)) {
    return `${file.name} isn't a PDF, JPEG or PNG file.`;
  }
  if (file.size > PARTNER_DOCUMENT_MAX_BYTES) return `${file.name} is larger than 20 MB.`;
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
function putFile(
  url: string,
  file: File,
  onProgress?: (fraction: number) => void,
  contentType = file.type,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    // Content type and size are part of the signature; the browser sets the size.
    xhr.setRequestHeader("Content-Type", contentType);
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
 * Uploads one file and returns its `media_id`, ready to attach.
 * POST /admin/media/uploads, then PUT to the signed `upload_url`.
 */
async function uploadFile(
  purpose: "yacht_photo" | "partner_document" | "banner_image" | "yacht_spin_video",
  file: File,
  onProgress?: (fraction: number) => void,
  contentType = file.type,
): Promise<string> {
  const ticket = await adminApiClient.post("/admin/media/uploads", {
    body: {
      purpose,
      filename: file.name.slice(0, 255),
      content_type: contentType,
      size_bytes: file.size,
    },
    schema: uploadTicketSchema,
  });
  await putFile(ticket.upload_url, file, onProgress, contentType);
  onProgress?.(1);
  return ticket.media_id;
}

export const uploadYachtPhoto = (file: File, onProgress?: (fraction: number) => void) =>
  uploadFile("yacht_photo", file, onProgress);

/** A website banner image (POST /admin/media/uploads, purpose banner_image); same image types as yacht photos. */
export const uploadBannerImage = (file: File, onProgress?: (fraction: number) => void) =>
  uploadFile("banner_image", file, onProgress);

/** A 360° video (purpose yacht_spin_video), then attached with PUT /admin/yachts/{id}/spin. */
export const uploadSpinVideo = (file: File, onProgress?: (fraction: number) => void) =>
  uploadFile("yacht_spin_video", file, onProgress, spinVideoType(file));

export const uploadPartnerDocument = (file: File, onProgress?: (fraction: number) => void) =>
  uploadFile("partner_document", file, onProgress);
