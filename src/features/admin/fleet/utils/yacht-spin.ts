import { isApiError } from "@/services/http/api-error";
import { spinVideoProblem } from "@/services/admin/media.service";
import { SPIN_SECONDS_MAX, SPIN_SECONDS_MIN } from "@/services/admin/yacht-spin.service";

import { fleetErrorMessage, isPhotoUploadDown } from "./fleet-error-message";

/* Helpers for a yacht's 360° view. */

/** Frame counts offered: 36 to 72, in steps of 4. */
export const SPIN_FRAME_OPTIONS = Array.from({ length: 10 }, (_, i) => 36 + i * 4);

/**
 * The video's length in seconds, read by the browser; null when it can't tell
 * (e.g. some MOV files). The backend checks the length again either way.
 */
export function videoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let settled = false;
    const done = (seconds: number | null) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      video.removeAttribute("src");
      resolve(seconds);
    };
    video.preload = "metadata";
    video.muted = true;
    video.onloadedmetadata = () => done(Number.isFinite(video.duration) ? video.duration : null);
    video.onerror = () => done(null);
    setTimeout(() => done(null), 10_000);
    video.src = url;
  });
}

/** Why this file can't be a 360° video (type, size, then length), or null. */
export async function checkSpinVideo(
  file: File,
): Promise<{ problem: string | null; seconds: number | null }> {
  const problem = spinVideoProblem(file);
  if (problem) return { problem, seconds: null };
  const seconds = await videoDuration(file);
  if (seconds !== null && seconds < SPIN_SECONDS_MIN)
    return { problem: `${file.name} is shorter than ${SPIN_SECONDS_MIN} seconds.`, seconds };
  if (seconds !== null && seconds > SPIN_SECONDS_MAX + 0.5)
    return { problem: `${file.name} is longer than ${SPIN_SECONDS_MAX} seconds.`, seconds };
  return { problem: null, seconds };
}

export const formatSeconds = (seconds: number) =>
  seconds < 60
    ? `${Math.round(seconds)} s`
    : `${Math.floor(seconds / 60)} min ${Math.round(seconds % 60)} s`;

export const formatMegabytes = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

/** A short message for a failed 360° request. */
export function spinErrorMessage(error: unknown): string {
  if (isPhotoUploadDown(error)) return "Video upload isn’t available right now. Try again later.";
  if (isApiError(error)) {
    if (error.code === "INVALID_MEDIA")
      return "The video wasn’t accepted. Use an MP4, MOV or WebM video of 2–60 seconds, up to 200 MB.";
    if (error.code === "SPIN_NOT_FOUND") return "This yacht has no live 360° view.";
    if (error.status === 400) return "That starting frame is beyond the number of frames.";
  }
  return fleetErrorMessage(error);
}
