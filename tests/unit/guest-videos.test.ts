import { describe, expect, it } from "vitest";

import {
  emptyGuestVideoDraft,
  draftFromGuestVideo,
  formatFileSize,
  guestVideoErrorMessage,
  guestVideoErrors,
  guestVideoInput,
  guestVideoPatch,
  guestVideoUploadMessage,
  NEEDS_VIDEO,
} from "@/features/admin/content/utils/guest-videos";
import { isContentTab, TAB_LABEL } from "@/features/admin/content/utils/content-format";
import type { GuestVideo } from "@/services/admin/guest-videos.service";
import { guestVideoProblem, guestVideoType, UPLOAD_REFUSED } from "@/services/admin/media.service";
import { playableGuestVideos } from "@/services/user/content.service";
import { ApiError } from "@/services/http/api-error";

const saved: GuestVideo = {
  id: "v-1",
  title: "An evening with the Menon family",
  description: "Lovely.",
  location: "Kochi",
  media_id: "m-1",
  video_url: "https://cdn.test/v.mp4",
  video_content_type: "video/mp4",
  video_size_bytes: 1024,
  video_filename: "menon.mp4",
  is_published: false,
  sort_order: 2,
  created_at: "2026-11-01T00:00:00.000Z",
  updated_at: "2026-11-01T00:00:00.000Z",
};

const file = (name: string, type: string, size: number) => {
  const f = new File(["x"], name, { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
};

describe("guest video form", () => {
  it("needs a title, sane lengths and a whole-number order", () => {
    expect(guestVideoErrors(emptyGuestVideoDraft, false)).toEqual({ title: "Enter a title." });
    const long = {
      ...emptyGuestVideoDraft,
      title: "x".repeat(201),
      description: "d".repeat(2001),
      location: "l".repeat(201),
      order: "1.5",
    };
    expect(Object.keys(guestVideoErrors(long, false)).sort()).toEqual([
      "description",
      "location",
      "order",
      "title",
    ]);
  });

  it("refuses to publish without a video, but saves a draft without one", () => {
    const d = { ...emptyGuestVideoDraft, title: "Hello" };
    expect(guestVideoErrors(d, false)).toEqual({});
    expect(guestVideoErrors(d, true)).toEqual({ mediaId: NEEDS_VIDEO });
    expect(guestVideoErrors({ ...d, mediaId: "m-9" }, true)).toEqual({});
  });

  it("creates a draft by default, with emptied text as null", () => {
    expect(guestVideoInput({ ...emptyGuestVideoDraft, title: " Hi ", order: "3" }, false)).toEqual({
      title: "Hi",
      description: null,
      location: null,
      media_id: null,
      is_published: false,
      sort_order: 3,
    });
  });

  it("patches only what changed", () => {
    const d = draftFromGuestVideo(saved);
    expect(guestVideoPatch(saved, d, false)).toEqual({});
    expect(guestVideoPatch(saved, { ...d, title: "New title" }, true)).toEqual({
      title: "New title",
      is_published: true,
    });
    // Cleared text and a removed video are sent as null.
    expect(
      guestVideoPatch(saved, { ...d, description: " ", location: "", mediaId: null }, false),
    ).toEqual({
      description: null,
      location: null,
      media_id: null,
    });
    // A replacement video and a new order.
    expect(guestVideoPatch(saved, { ...d, mediaId: "m-2", order: "0" }, false)).toEqual({
      media_id: "m-2",
      sort_order: 0,
    });
  });

  it("explains failures", () => {
    const http = (status: number, code?: string) =>
      new ApiError("x", { kind: "http", status, body: code ? { code } : undefined });
    expect(guestVideoErrorMessage(http(400, "INCOMPLETE_CONTENT"))).toBe(NEEDS_VIDEO);
    expect(guestVideoErrorMessage(http(400, "INVALID_MEDIA"))).toMatch(/MP4 or WebM/);
    expect(guestVideoErrorMessage(http(403))).toMatch(/permission/);
    expect(guestVideoErrorMessage(http(404))).toMatch(/no longer exists/);
    expect(guestVideoUploadMessage(http(403, UPLOAD_REFUSED))).toMatch(/expired/);
    expect(guestVideoUploadMessage(http(503, "STORAGE_NOT_CONFIGURED"))).toMatch(/isn’t available/);
  });

  it("formats sizes", () => {
    expect(formatFileSize(12.4 * 1024 * 1024)).toBe("12.4 MB");
    expect(formatFileSize(2048)).toBe("2 KB");
  });

  it("is a tab of the Content page", () => {
    expect(isContentTab("guest-videos")).toBe(true);
    expect(TAB_LABEL["guest-videos"]).toBe("Guest videos");
  });
});

describe("guest video files", () => {
  it("accepts MP4 and WebM up to 100 MB", () => {
    expect(guestVideoProblem(file("a.mp4", "video/mp4", 5_000_000))).toBeNull();
    expect(guestVideoProblem(file("a.webm", "video/webm", 5_000_000))).toBeNull();
    expect(guestVideoProblem(file("a.mov", "video/quicktime", 5_000_000))).toMatch(/MP4 or WebM/);
    expect(guestVideoProblem(file("a.mp4", "video/mp4", 100 * 1024 * 1024 + 1))).toMatch(/100 MB/);
    expect(guestVideoProblem(file("a.mp4", "video/mp4", 0))).toMatch(/empty/);
  });

  it("reads the type from the extension when the browser leaves it blank", () => {
    expect(guestVideoType(file("a.webm", "", 10))).toBe("video/webm");
    expect(guestVideoType(file("a.mp4", "", 10))).toBe("video/mp4");
    expect(guestVideoProblem(file("a.avi", "", 10))).toMatch(/MP4 or WebM/);
  });
});

describe("public guest videos", () => {
  it("skips videos without a link", () => {
    const v = { id: "1", title: "t", description: null, location: null, video_content_type: null };
    expect(
      playableGuestVideos([
        { ...v, video_url: "https://cdn.test/1.mp4" },
        { ...v, id: "2", video_url: null },
      ]).map((x) => x.id),
    ).toEqual(["1"]);
  });
});
