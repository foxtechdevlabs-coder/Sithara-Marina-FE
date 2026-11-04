"use client";

import { GripVertical, Upload, X } from "lucide-react";
import { useEffect, useRef, useState, type DragEvent } from "react";

import { MUTED } from "@/components/admin/admin-theme";
import { Notice } from "@/components/admin/form-parts";
import { cx } from "@/lib/cx";
import {
  attachPhotos,
  deletePhoto,
  reorderPhotos,
  type YachtPhoto,
} from "@/services/admin/fleet.service";
import {
  YACHT_PHOTO_TYPES,
  uploadYachtPhoto,
  yachtPhotoProblem,
} from "@/services/admin/media.service";

import {
  fleetErrorMessage,
  isPhotoUploadDown,
  photoUploadMessage,
} from "../utils/fleet-error-message";
import { PhotoLightbox } from "./photo-lightbox";

/** A photo picked before the yacht exists; uploaded after it is created. */
export interface QueuedPhoto {
  key: string;
  file: File;
  /** Blob URL for the preview. */
  src: string;
}

interface Tile {
  id: string;
  src: string;
  alt: string;
}

/** Splits picked files into usable ones and a message about the rest. */
function screen(files: File[]): { ok: File[]; problem: string } {
  const problems: string[] = [];
  const ok = files.filter((f) => {
    const problem = yachtPhotoProblem(f);
    if (problem) problems.push(problem);
    return !problem;
  });
  return { ok, problem: problems.join(" ") };
}

const moved = <T,>(items: T[], from: number, to: number) => {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
};

type Props =
  | {
      /** Before the yacht exists: photos are kept here and uploaded after creation. */
      mode: "queued";
      queued: QueuedPhoto[];
      onQueuedChange: (photos: QueuedPhoto[]) => void;
    }
  | {
      /** An existing yacht: every change is saved straight away. */
      mode: "live";
      yachtId: string;
      photos: YachtPhoto[];
      onPhotosChange: (photos: YachtPhoto[]) => void;
    };

/**
 * The gallery from the admin Figma design: drag to reorder, "Use in search"
 * makes a photo the cover (first), upload by picking or dropping files.
 *
 * Live mode: upload = POST /admin/media/uploads + PUT to the signed link +
 * POST /admin/yachts/{id}/photos; reorder = PATCH …/photos/order; remove =
 * DELETE …/photos/{photoId}.
 */
export function YachtGallery(props: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploads, setUploads] = useState<{ name: string; progress: number }[]>([]);
  const [problem, setProblem] = useState("");
  const [notice, setNotice] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const tiles: Tile[] =
    props.mode === "queued"
      ? props.queued.map((p) => ({ id: p.key, src: p.src, alt: p.file.name }))
      : props.photos.map((p, i) => ({ id: p.id, src: p.url, alt: `Photo ${i + 1}` }));

  // Free the preview blob URLs of queued photos when leaving the page.
  const queuedRef = useRef(props.mode === "queued" ? props.queued : []);
  useEffect(() => {
    if (props.mode === "queued") queuedRef.current = props.queued;
  });
  useEffect(() => () => queuedRef.current.forEach((p) => URL.revokeObjectURL(p.src)), []);

  async function addFiles(files: File[]) {
    if (!files.length || busy) return;
    const { ok, problem: rejected } = screen(files);
    setProblem(rejected);
    setNotice("");
    if (!ok.length) return;

    if (props.mode === "queued") {
      const room = 30 - props.queued.length;
      const added = ok.slice(0, Math.max(0, room)).map((file, i) => ({
        key: `queued-${Date.now()}-${i}`,
        file,
        src: URL.createObjectURL(file),
      }));
      if (ok.length > added.length) setProblem("You can add up to 30 photos at once.");
      props.onQueuedChange([...props.queued, ...added]);
      return;
    }

    const batch = ok.slice(0, 30);
    setBusy(true);
    setUploads(batch.map((f) => ({ name: f.name, progress: 0 })));
    const results = await Promise.allSettled(
      batch.map((file, index) =>
        uploadYachtPhoto(file, (progress) =>
          setUploads((u) => u.map((item, i) => (i === index ? { ...item, progress } : item))),
        ),
      ),
    );
    const mediaIds = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    const failed = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    try {
      if (mediaIds.length) {
        const attached = await attachPhotos(props.yachtId, mediaIds);
        props.onPhotosChange([...props.photos, ...attached]);
        setNotice(`${attached.length} ${attached.length === 1 ? "photo" : "photos"} added.`);
      }
      if (failed.length) {
        const text = `${failed.length} ${failed.length === 1 ? "photo wasn't" : "photos weren't"} added. ${photoUploadMessage(failed[0]!.reason)}`;
        // Photos are optional, so storage being unavailable is a note, not an error.
        if (isPhotoUploadDown(failed[0]!.reason)) setNotice(text);
        else setProblem(text);
      }
    } catch (err) {
      setProblem(`The photos were uploaded but couldn't be added. ${fleetErrorMessage(err)}`);
    } finally {
      setBusy(false);
      setUploads([]);
    }
  }

  async function reorder(fromId: string, toId: string) {
    const from = tiles.findIndex((t) => t.id === fromId);
    const to = tiles.findIndex((t) => t.id === toId);
    if (from < 0 || to < 0 || from === to || busy) return;

    if (props.mode === "queued") {
      props.onQueuedChange(moved(props.queued, from, to));
      return;
    }
    const before = props.photos;
    const next = moved(before, from, to);
    props.onPhotosChange(next); // shown at once, put back if the server refuses
    setBusy(true);
    setProblem("");
    setNotice("");
    try {
      props.onPhotosChange(
        await reorderPhotos(
          props.yachtId,
          next.map((p) => p.id),
        ),
      );
      setNotice(to === 0 ? "Cover photo updated." : "Photo order saved.");
    } catch (err) {
      props.onPhotosChange(before);
      setProblem(`Couldn't save the new order. ${fleetErrorMessage(err)}`);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string, index: number) {
    if (busy) return;
    if (props.mode === "queued") {
      const photo = props.queued.find((p) => p.key === id);
      if (photo) URL.revokeObjectURL(photo.src);
      props.onQueuedChange(props.queued.filter((p) => p.key !== id));
      return;
    }
    if (!window.confirm(`Delete photo ${index + 1}? This can't be undone.`)) return;
    setBusy(true);
    setProblem("");
    setNotice("");
    try {
      await deletePhoto(props.yachtId, id);
      props.onPhotosChange(props.photos.filter((p) => p.id !== id));
      setNotice("Photo deleted.");
    } catch (err) {
      setProblem(
        (err as { code?: string })?.code === "NOT_PUBLISHABLE"
          ? "This is the last photo of a yacht that is visible on the website. Hide the yacht first, or add another photo."
          : `Couldn't delete the photo. ${fleetErrorMessage(err)}`,
      );
    } finally {
      setBusy(false);
    }
  }

  const onDropFiles = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) void addFiles(Array.from(e.dataTransfer.files));
  };

  return (
    <div aria-busy={busy}>
      <p className="-mt-[12px] text-[12px] leading-[18px]" style={{ color: "#4a4f55" }}>
        Optional for now: a yacht needs at least one photo before it can be visible on the website.
        Drag to reorder; choose the image used in yacht search. Landscape, 2400px wide or more.
        {props.mode === "live" && " Changes to photos are saved straight away."}
      </p>

      {(problem || notice) && (
        <Notice tone={problem ? "error" : "success"} className="mt-[14px]">
          {problem || notice}
        </Notice>
      )}

      <ul className="mt-[18px] grid grid-cols-1 gap-[16px] sm:grid-cols-2 md:grid-cols-3">
        {tiles.map((p, i) => (
          <li
            key={p.id}
            draggable={!busy}
            onDragStart={() => setDragId(p.id)}
            onDragEnd={() => setDragId(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId) void reorder(dragId, p.id);
              else onDropFiles(e);
            }}
            className={cx(
              "group border bg-white transition-opacity",
              i === 0 ? "border-2 border-[#0d1b2a]" : "border-[#eceae6]",
              dragId === p.id && "opacity-50",
            )}
          >
            <div className="relative">
              <button
                type="button"
                onClick={() => setViewing(i)}
                aria-label={`View photo ${i + 1} full screen`}
                className="block w-full cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d1b2a]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- storage URLs and local blob previews */}
                <img
                  src={p.src}
                  alt={p.alt}
                  draggable={false}
                  className="aspect-[4/3] w-full object-cover"
                />
              </button>
              {i === 0 && (
                <span className="absolute top-[8px] left-[8px] bg-[#0d1b2a] px-[8px] py-[3px] text-[9px] tracking-[0.12em] text-white uppercase">
                  Cover
                </span>
              )}
              <button
                type="button"
                onClick={() => void remove(p.id, i)}
                disabled={busy}
                aria-label={`Remove photo ${i + 1}`}
                className="absolute top-[8px] right-[8px] flex size-[28px] items-center justify-center bg-white/90 text-[#0d1b2a] transition-[opacity,background-color] hover:bg-white focus-visible:opacity-100 disabled:opacity-50 lg:opacity-0 lg:group-hover:opacity-100"
              >
                <X aria-hidden="true" strokeWidth={1.75} className="size-[14px]" />
              </button>
            </div>
            <div className="flex h-[38px] items-center justify-between px-[10px]">
              <span className="flex items-center gap-[2px]">
                <GripVertical
                  aria-hidden="true"
                  strokeWidth={1.5}
                  className="size-[14px] cursor-grab text-[#b5b8bc]"
                />
                <span className="sr-only">
                  Photo {i + 1} of {tiles.length}
                </span>
                {i > 0 && (
                  <button
                    type="button"
                    onClick={() => void reorder(p.id, tiles[i - 1]!.id)}
                    disabled={busy}
                    className="ml-1 px-1 text-[11px] text-[#8a8d91] hover:text-[#0d1b2a] disabled:opacity-50"
                    aria-label={`Move photo ${i + 1} earlier`}
                  >
                    ←
                  </button>
                )}
              </span>
              {i === 0 ? (
                <span className="text-[11px] underline underline-offset-2">Search image</span>
              ) : (
                <button
                  type="button"
                  onClick={() => void reorder(p.id, tiles[0]!.id)}
                  disabled={busy}
                  className="text-[11px] underline underline-offset-2 hover:opacity-70 disabled:opacity-50"
                >
                  Use in search
                </button>
              )}
            </div>
          </li>
        ))}
        {uploads.map((u, i) => (
          <li
            key={`${i}-${u.name}`}
            className="flex aspect-[4/3] flex-col items-center justify-center gap-[8px] border border-[#dcdad5] px-[16px] text-center"
            style={{ backgroundColor: "#f5f3ee" }}
          >
            <span className="w-full truncate text-[12px]">{u.name}</span>
            <span
              role="progressbar"
              aria-label={`Uploading ${u.name}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(u.progress * 100)}
              className="block h-[3px] w-full bg-[#e3e1dc]"
            >
              <span
                className="block h-full bg-[#0d1b2a] transition-[width]"
                style={{ width: `${Math.round(u.progress * 100)}%` }}
              />
            </span>
            <span className="text-[11px]" style={{ color: MUTED }}>
              {u.progress >= 1 ? "Adding…" : `Uploading ${Math.round(u.progress * 100)}%`}
            </span>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDropFiles}
            disabled={busy}
            className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-[4px] border border-[#dcdad5] text-center transition-colors hover:border-[#0d1b2a] disabled:cursor-wait disabled:opacity-60"
            style={{ backgroundColor: "#f5f3ee" }}
          >
            <Upload aria-hidden="true" strokeWidth={1.5} className="mb-[6px] size-[16px]" />
            <span className="text-[13px]">{busy ? "Working…" : "Upload photos"}</span>
            <span className="text-[11px]" style={{ color: MUTED }}>
              or drop files here
            </span>
          </button>
          <input
            ref={fileInput}
            type="file"
            accept={YACHT_PHOTO_TYPES.join(",")}
            multiple
            hidden
            onChange={(e) => {
              const files = Array.from(e.currentTarget.files ?? []);
              e.currentTarget.value = "";
              void addFiles(files);
            }}
          />
        </li>
      </ul>

      {viewing !== null && tiles[viewing] && (
        <PhotoLightbox
          photos={tiles}
          index={viewing}
          onIndexChange={setViewing}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  );
}
