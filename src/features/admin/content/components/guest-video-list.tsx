"use client";

import Link from "next/link";
import { useState } from "react";

import { BODY, MUTED, SAND } from "@/components/admin/admin-theme";
import {
  Label,
  LoadState,
  Notice,
  OUTLINE_STYLE,
  PRIMARY_STYLE,
  SelectBox,
  Toggle,
} from "@/components/admin/form-parts";
import { adminRoutes } from "@/constants/routes";
import { smallOutline, smallPrimary } from "@/features/admin/bookings/components/booking-ui";
import { formatInstant } from "@/features/admin/bookings/utils/booking-format";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { Pager } from "@/features/admin/reports/components/report-parts";
import { cx } from "@/lib/cx";
import {
  deleteGuestVideo,
  listGuestVideos,
  updateGuestVideo,
  type GuestVideo,
} from "@/services/admin/guest-videos.service";

import { guestVideoErrorMessage } from "../utils/guest-videos";

const PAGE_SIZE = 20;

type Status = "" | "published" | "draft";

/**
 * The "Guest videos" tab: GET /admin/guest-videos with a status filter and
 * pages; publish or unpublish (PATCH) and delete (DELETE) from each card.
 */
export function GuestVideoList() {
  const [status, setStatus] = useState<Status>("");
  const [page, setPage] = useState(1);
  const query = { page, limit: PAGE_SIZE, ...(status ? { status } : {}) };
  const list = useAdminQuery(
    (signal) => listGuestVideos(query, signal),
    `guest-videos:${JSON.stringify(query)}`,
  );
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string }>();
  const data = list.error ? null : list.data;
  const items = [...(data?.items ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  async function setPublished(video: GuestVideo, published: boolean) {
    setBusyId(video.id);
    setNotice(undefined);
    try {
      await updateGuestVideo(video.id, { is_published: published });
      setNotice({
        tone: "success",
        text: published
          ? `“${video.title}” is published. It’s shown in the website’s Guests section.`
          : `“${video.title}” is now a draft. It’s no longer on the website.`,
      });
      list.reload();
    } catch (err) {
      setNotice({ tone: "error", text: guestVideoErrorMessage(err) });
    } finally {
      setBusyId(null);
    }
  }

  async function remove(video: GuestVideo) {
    setBusyId(video.id);
    setNotice(undefined);
    try {
      await deleteGuestVideo(video.id);
      setConfirmId(null);
      setNotice({ tone: "success", text: `“${video.title}” was deleted.` });
      // The last one on a later page: show the page before it.
      if (items.length === 1 && page > 1) setPage(page - 1);
      else list.reload();
    } catch (err) {
      setNotice({ tone: "error", text: guestVideoErrorMessage(err) });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="mt-[18px] w-full sm:w-[240px]">
        <Label htmlFor="guest-video-status">Publication status</Label>
        <SelectBox
          id="guest-video-status"
          value={status}
          onChange={(v) => {
            setStatus(v as Status);
            setPage(1);
            setNotice(undefined);
          }}
          options={[
            { value: "", label: "Published and drafts" },
            { value: "published", label: "Published" },
            { value: "draft", label: "Drafts" },
          ]}
        />
      </div>

      {notice && (
        <Notice tone={notice.tone} className="mt-[18px] lg:max-w-[880px]">
          {notice.text}
        </Notice>
      )}

      <div className="mt-[20px]">
        {!data ? (
          <LoadState
            loading={list.loading}
            error={
              list.error
                ? `Couldn't load guest videos. ${guestVideoErrorMessage(list.error)}`
                : undefined
            }
            onRetry={list.reload}
            label="Loading guest videos"
          />
        ) : !items.length ? (
          <p className="text-[13px]" style={{ color: BODY }}>
            {status
              ? "No guest videos have this status."
              : "No guest videos yet. Add one with “+ New guest video”."}
          </p>
        ) : (
          <div className={cx(list.loading && "opacity-60")}>
            <ul className="grid gap-[12px] sm:grid-cols-2 lg:grid-cols-3">
              {items.map((v) => (
                <li key={v.id} className="flex flex-col border border-[#e3e1dc] bg-white">
                  <VideoCard
                    video={v}
                    busy={busyId === v.id}
                    confirming={confirmId === v.id}
                    onPublish={(p) => void setPublished(v, p)}
                    onAskDelete={() => setConfirmId(v.id)}
                    onCancelDelete={() => setConfirmId(null)}
                    onDelete={() => void remove(v)}
                  />
                </li>
              ))}
            </ul>
            <Pager
              page={page}
              total={data.total}
              limit={PAGE_SIZE}
              busy={list.loading}
              onPage={setPage}
            />
          </div>
        )}
      </div>
    </>
  );
}

function VideoCard({
  video: v,
  busy,
  confirming,
  onPublish,
  onAskDelete,
  onCancelDelete,
  onDelete,
}: {
  video: GuestVideo;
  busy: boolean;
  confirming: boolean;
  onPublish: (published: boolean) => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      {v.video_url ? (
        <video
          src={v.video_url}
          controls
          preload="metadata"
          aria-label={`Video: ${v.title}`}
          className="aspect-video w-full bg-black object-contain"
        />
      ) : (
        <div
          className="flex aspect-video items-center justify-center px-[16px] text-center text-[11px]"
          style={{ backgroundColor: SAND, color: MUTED }}
        >
          {v.media_id ? "The video can’t be shown right now." : "No video yet"}
        </div>
      )}
      <div className="flex flex-1 flex-col px-[16px] py-[14px]">
        <p className="flex flex-wrap items-baseline gap-x-[8px] text-[15px]">
          <Link
            href={adminRoutes.guestVideo(v.id)}
            className="break-words hover:underline focus-visible:outline-2 focus-visible:outline-[#0d1b2a]"
          >
            {v.title}
          </Link>
          <span
            className="px-[6px] py-[1px] text-[10px]"
            style={{ backgroundColor: v.is_published ? "#dfe9f6" : SAND }}
          >
            {v.is_published ? "Published" : "Draft"}
          </span>
        </p>
        {v.location && (
          <p className="mt-[2px] text-[12px]" style={{ color: MUTED }}>
            {v.location}
          </p>
        )}
        {v.description && (
          <p className="mt-[4px] line-clamp-3 text-[12px] break-words" style={{ color: BODY }}>
            {v.description}
          </p>
        )}
        <p className="mt-[6px] text-[10px]" style={{ color: MUTED }}>
          Order {v.sort_order} · Added {formatInstant(v.created_at)} · Updated{" "}
          {formatInstant(v.updated_at)}
        </p>

        <div className="mt-auto pt-[14px]">
          <Toggle
            id={`publish-${v.id}`}
            label="Published"
            text={
              v.media_id || v.is_published
                ? "Shown in the website’s Guests section."
                : "Add a video before publishing."
            }
            checked={v.is_published}
            disabled={busy || (!v.media_id && !v.is_published)}
            onChange={onPublish}
          />
          {confirming ? (
            <div
              role="alertdialog"
              aria-labelledby={`delete-${v.id}`}
              className="mt-[12px] border border-[#dcdad5] px-[12px] py-[10px]"
            >
              <p id={`delete-${v.id}`} className="text-[13px]">
                Delete this guest video?
              </p>
              <p className="mt-[2px] text-[11px]" style={{ color: BODY }}>
                {v.is_published ? "It’s removed from the website straight away. " : ""}The video
                file is deleted too. This can’t be undone.
              </p>
              <div className="mt-[10px] flex flex-wrap gap-[10px]">
                <button
                  type="button"
                  disabled={busy}
                  onClick={onDelete}
                  className={smallPrimary}
                  style={PRIMARY_STYLE}
                >
                  {busy ? "Deleting…" : "Delete"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={onCancelDelete}
                  className={smallOutline}
                  style={OUTLINE_STYLE}
                >
                  Keep it
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-[12px] flex flex-wrap items-center gap-[14px]">
              <Link
                href={adminRoutes.guestVideo(v.id)}
                className={cx(smallOutline, "min-w-[90px]")}
                style={OUTLINE_STYLE}
              >
                Edit
              </Link>
              <button
                type="button"
                disabled={busy}
                onClick={onAskDelete}
                className="text-[12px] text-[#b3261e] underline underline-offset-2"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
