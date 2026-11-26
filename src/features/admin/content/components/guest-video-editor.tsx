"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";

import { BODY, MUTED, SAND } from "@/components/admin/admin-theme";
import {
  errorProps,
  FieldError,
  input,
  Label,
  LoadState,
  Notice,
  OUTLINE_STYLE,
  PRIMARY_STYLE,
  Section,
} from "@/components/admin/form-parts";
import { adminRoutes } from "@/constants/routes";
import {
  PageHeader,
  pagePadding,
  smallOutline,
  smallPrimary,
} from "@/features/admin/bookings/components/booking-ui";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { cx } from "@/lib/cx";
import {
  createGuestVideo,
  deleteGuestVideo,
  getGuestVideo,
  updateGuestVideo,
  type GuestVideo,
} from "@/services/admin/guest-videos.service";
import { guestVideoProblem, uploadGuestVideo } from "@/services/admin/media.service";
import { isApiError } from "@/services/http/api-error";

import {
  DESCRIPTION_MAX,
  draftFromGuestVideo,
  emptyGuestVideoDraft,
  formatFileSize,
  guestVideoErrorMessage,
  guestVideoErrors,
  guestVideoInput,
  guestVideoPatch,
  guestVideoUploadMessage,
  LOCATION_MAX,
  TITLE_MAX,
  type GuestVideoDraft,
} from "../utils/guest-videos";

const textarea = cx(input, "h-auto py-[12px] leading-[20px]");
const ACCEPT = "video/mp4,video/webm,.mp4,.m4v,.webm";
const HEADING = "Words and images, considered.";
const listRoute = adminRoutes.contentKind("guest-videos");

/** Add a guest video, or edit one (GET /admin/guest-videos/{id}). */
export function GuestVideoEditor({ videoId }: { videoId?: string }) {
  const video = useAdminQuery(
    (signal) => (videoId ? getGuestVideo(videoId, signal) : Promise.resolve(null)),
    `guest-video:${videoId ?? "new"}`,
  );
  if (videoId && video.data === undefined) {
    const gone = isApiError(video.error) && video.error.status === 404;
    return (
      <div className={pagePadding}>
        <PageHeader title={HEADING} />
        {gone ? (
          <p className="mt-[24px] text-[14px]" style={{ color: BODY }}>
            This guest video no longer exists.{" "}
            <Link href={listRoute} className="underline underline-offset-2">
              Back to guest videos
            </Link>
          </p>
        ) : (
          <div className="mt-[24px]">
            <LoadState
              loading={video.loading}
              error={
                video.error
                  ? `Couldn't load the guest video. ${guestVideoErrorMessage(video.error)}`
                  : undefined
              }
              onRetry={video.reload}
              label="Loading guest video"
            />
          </div>
        )}
      </div>
    );
  }
  return <Editor key={videoId ?? "new"} initial={video.data ?? null} />;
}

/** The chosen file, shown until it's replaced. */
interface Picked {
  name: string;
  size: number;
  /** Local preview (object URL). */
  url: string;
}

function Editor({ initial }: { initial: GuestVideo | null }) {
  const router = useRouter();
  const [saved, setSaved] = useState<GuestVideo | null>(initial);
  const [draft, setDraft] = useState<GuestVideoDraft>(() =>
    initial ? draftFromGuestVideo(initial) : emptyGuestVideoDraft,
  );
  /** The last save tried: field errors show from then on, for that intent. */
  const [attempt, setAttempt] = useState<"draft" | "publish" | null>(null);
  const [busy, setBusy] = useState<"" | "draft" | "publish" | "delete">("");
  const [upload, setUpload] = useState<number | null>(null);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [dragging, setDragging] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string }>();
  const fileInput = useRef<HTMLInputElement>(null);
  const previewUrl = useRef<string | null>(null);

  // Free the local preview when the page closes.
  useEffect(() => () => void (previewUrl.current && URL.revokeObjectURL(previewUrl.current)), []);

  const set = <K extends keyof GuestVideoDraft>(k: K, v: GuestVideoDraft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));
  const errors = attempt ? guestVideoErrors(draft, attempt === "publish") : {};
  const published = saved?.is_published ?? false;

  // What the video area shows: a newly chosen file, else the saved video.
  const keepsSaved = Boolean(saved?.media_id) && draft.mediaId === saved?.media_id;
  const shown = picked
    ? { url: picked.url, name: picked.name, size: picked.size }
    : keepsSaved && saved
      ? { url: saved.video_url, name: saved.video_filename, size: saved.video_size_bytes }
      : null;

  async function pick(file: File | undefined) {
    if (!file) return;
    const problem = guestVideoProblem(file);
    if (problem) return setNotice({ tone: "error", text: problem });
    setNotice(undefined);
    setUpload(0);
    try {
      const mediaId = await uploadGuestVideo(file, setUpload);
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
      previewUrl.current = URL.createObjectURL(file);
      setPicked({ name: file.name, size: file.size, url: previewUrl.current });
      set("mediaId", mediaId);
      setNotice({
        tone: "success",
        text: saved
          ? "Video uploaded. Save to use it; the previous video is then deleted."
          : "Video uploaded. Save to keep it.",
      });
    } catch (err) {
      setNotice({
        tone: "error",
        text: `The video couldn’t be uploaded. ${guestVideoUploadMessage(err)}`,
      });
    } finally {
      setUpload(null);
    }
  }

  function removeVideo() {
    setPicked(null);
    set("mediaId", null);
  }

  async function save(intent: "draft" | "publish") {
    setAttempt(intent);
    setNotice(undefined);
    const publish = intent === "publish";
    if (Object.keys(guestVideoErrors(draft, publish)).length) return;
    setBusy(intent);
    try {
      let next: GuestVideo;
      if (saved) {
        const patch = guestVideoPatch(saved, draft, publish);
        // Nothing changed: just go back to the list.
        if (!Object.keys(patch).length) return router.push(listRoute);
        next = await updateGuestVideo(saved.id, patch);
      } else {
        next = await createGuestVideo(guestVideoInput(draft, publish));
      }
      setSaved(next);
      // Back to the Guest videos tab, which confirms the save. The buttons stay
      // disabled (busy) until the page changes, so it can't be saved twice.
      router.push(`${listRoute}&notice=${next.is_published ? "published" : "draft"}` as Route);
    } catch (err) {
      setNotice({ tone: "error", text: guestVideoErrorMessage(err) });
      setBusy("");
    }
  }

  async function remove() {
    if (!saved) return;
    setBusy("delete");
    try {
      await deleteGuestVideo(saved.id);
      router.push(`${listRoute}&notice=deleted` as Route);
    } catch (err) {
      setNotice({ tone: "error", text: guestVideoErrorMessage(err) });
      setBusy("");
      setConfirmDelete(false);
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (upload === null) void pick(e.dataTransfer.files[0]);
  };
  const locked = Boolean(busy) || upload !== null;

  return (
    <div className={pagePadding}>
      <PageHeader
        title={HEADING}
        subtitle={`Content editor · Guest video · ${draft.title.trim() || (saved ? "Guest video" : "New guest video")}`}
      />

      <form
        noValidate
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          void save(published ? "publish" : "draft");
        }}
        className="mt-[24px] grid gap-[28px] lg:mt-[30px] lg:max-w-[760px]"
      >
        <Section id="video-information" title="Video information">
          <div className="grid gap-x-[18px] gap-y-[22px] lg:grid-cols-2">
            <div>
              <Label htmlFor="video-title" required>
                Video title
              </Label>
              <input
                id="video-title"
                value={draft.title}
                maxLength={TITLE_MAX}
                placeholder="An evening with the Menon family"
                onChange={(e) => set("title", e.currentTarget.value)}
                className={input}
                {...errorProps("video-title", errors.title)}
              />
              <FieldError id="video-title" message={errors.title} />
            </div>
            <div>
              <Label htmlFor="video-location" hint="optional">
                Location
              </Label>
              <input
                id="video-location"
                value={draft.location}
                maxLength={LOCATION_MAX}
                placeholder="e.g. Kochi"
                onChange={(e) => set("location", e.currentTarget.value)}
                className={input}
                {...errorProps("video-location", errors.location)}
              />
              <FieldError id="video-location" message={errors.location} />
            </div>
            <div className="lg:col-span-2">
              <Label
                htmlFor="video-description"
                hint={`optional · ${draft.description.length}/${DESCRIPTION_MAX}`}
              >
                Description
              </Label>
              <textarea
                id="video-description"
                rows={4}
                value={draft.description}
                maxLength={DESCRIPTION_MAX}
                placeholder="What the guests said about their time on board."
                onChange={(e) => set("description", e.currentTarget.value)}
                className={textarea}
                {...errorProps("video-description", errors.description)}
              />
              <FieldError id="video-description" message={errors.description} />
            </div>
          </div>
        </Section>

        <Section id="video-upload" title="Video">
          <div
            id="video-file"
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cx(
              "border border-dashed p-[16px] transition-colors",
              dragging ? "border-[#0d1b2a] bg-[#f3f1ec]" : "border-[#cfccc6]",
            )}
          >
            {shown?.url ? (
              <video
                key={shown.url}
                src={shown.url}
                controls
                preload="metadata"
                aria-label="Video preview"
                className="aspect-video w-full bg-black object-contain"
              />
            ) : (
              <div
                className="flex aspect-video w-full items-center justify-center px-[16px] text-center text-[12px]"
                style={{ backgroundColor: SAND, color: MUTED }}
              >
                {shown
                  ? "The saved video can’t be previewed right now."
                  : "No video yet. Drop an MP4 or WebM file here, or choose one."}
              </div>
            )}

            {shown && (shown.name || shown.size !== null) && (
              <p className="mt-[10px] text-[13px] break-words">
                {shown.name ?? "Video"}
                {shown.size !== null && (
                  <span style={{ color: MUTED }}> · {formatFileSize(shown.size)}</span>
                )}
                {picked && saved && draft.mediaId !== saved.media_id && (
                  <span style={{ color: MUTED }}> · not saved yet</span>
                )}
              </p>
            )}

            {upload !== null && (
              <div role="status" aria-label="Uploading the video" className="mt-[12px]">
                <div className="h-[6px] w-full bg-[#e3e1dc]">
                  <div
                    className="h-full bg-[#0d1b2a]"
                    style={{ width: `${Math.round(upload * 100)}%` }}
                  />
                </div>
                <p className="mt-[6px] text-[12px]" style={{ color: BODY }}>
                  Uploading video {Math.round(upload * 100)}%
                </p>
              </div>
            )}

            <div className="mt-[12px] flex flex-wrap items-center gap-[14px]">
              <button
                type="button"
                disabled={locked}
                onClick={() => fileInput.current?.click()}
                className={cx(smallOutline, "min-w-[150px]")}
                style={OUTLINE_STYLE}
              >
                {upload !== null ? "Uploading…" : draft.mediaId ? "Replace video" : "Choose video"}
              </button>
              {draft.mediaId && (
                <button
                  type="button"
                  disabled={locked}
                  onClick={removeVideo}
                  className="text-[12px] underline underline-offset-2"
                >
                  Remove video
                </button>
              )}
              {!draft.mediaId && saved?.media_id && (
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => set("mediaId", saved.media_id)}
                  className="text-[12px] underline underline-offset-2"
                >
                  Keep the saved video
                </button>
              )}
              <input
                ref={fileInput}
                type="file"
                accept={ACCEPT}
                hidden
                aria-label="Guest video file"
                onChange={(e) => {
                  const file = e.currentTarget.files?.[0];
                  e.currentTarget.value = "";
                  void pick(file);
                }}
              />
            </div>
            <p className="mt-[8px] text-[11px]" style={{ color: BODY }}>
              MP4 or WebM, up to 100 MB.
              {saved?.media_id ? " A replaced or removed video is deleted when you save." : ""}
            </p>
          </div>
          <FieldError id="video-file" message={errors.mediaId} />
        </Section>

        <Section id="video-publishing" title="Publishing">
          <div className="grid gap-x-[18px] gap-y-[22px] lg:grid-cols-2">
            <div>
              <p className="text-[12px]" style={{ color: MUTED }}>
                Status
              </p>
              <p className="mt-[6px] flex items-center gap-[8px] text-[14px]">
                <span
                  className="px-[6px] py-[1px] text-[10px]"
                  style={{ backgroundColor: published ? "#dfe9f6" : SAND }}
                >
                  {published ? "Published" : "Draft"}
                </span>
                <span className="text-[12px]" style={{ color: BODY }}>
                  {published ? "Shown in the Guests section." : "Not on the website."}
                </span>
              </p>
            </div>
            <div>
              <Label htmlFor="video-order" hint="lower shows first">
                Display order
              </Label>
              <input
                id="video-order"
                inputMode="numeric"
                value={draft.order}
                maxLength={4}
                onChange={(e) => set("order", e.currentTarget.value.replace(/\D/g, ""))}
                className={input}
                {...errorProps("video-order", errors.order)}
              />
              <FieldError id="video-order" message={errors.order} />
            </div>
          </div>
        </Section>

        {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}

        <div className="flex flex-wrap items-center gap-[14px]">
          <button
            type="button"
            disabled={locked}
            onClick={() => void save("publish")}
            className={cx(smallPrimary, "min-w-[130px]")}
            style={PRIMARY_STYLE}
          >
            {busy === "publish" ? "Saving…" : published ? "Save changes" : "Publish"}
          </button>
          <button
            type="button"
            disabled={locked}
            onClick={() => void save("draft")}
            className={cx(smallOutline, "min-w-[130px]")}
            style={OUTLINE_STYLE}
          >
            {busy === "draft" ? "Saving…" : published ? "Unpublish" : "Save as draft"}
          </button>
          <Link
            href={listRoute}
            className={cx(smallOutline, "min-w-[110px]")}
            style={OUTLINE_STYLE}
          >
            Cancel
          </Link>
          {saved && !confirmDelete && (
            <button
              type="button"
              disabled={locked}
              onClick={() => setConfirmDelete(true)}
              className="text-[12px] text-[#b3261e] underline underline-offset-2"
            >
              Delete
            </button>
          )}
        </div>
        {confirmDelete && (
          <div
            role="alertdialog"
            aria-labelledby="delete-title"
            className="border border-[#dcdad5] bg-white px-[16px] py-[14px] lg:max-w-[580px]"
          >
            <p id="delete-title" className="text-[14px]">
              Delete this guest video?
            </p>
            <p className="mt-[4px] text-[12px]" style={{ color: BODY }}>
              {published ? "It’s removed from the website straight away. " : ""}The video file is
              deleted too. This can’t be undone.
            </p>
            <div className="mt-[12px] flex flex-wrap gap-[10px]">
              <button
                type="button"
                disabled={busy === "delete"}
                onClick={() => void remove()}
                className={smallPrimary}
                style={PRIMARY_STYLE}
              >
                {busy === "delete" ? "Deleting…" : "Delete"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className={smallOutline}
                style={OUTLINE_STYLE}
              >
                Keep it
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
