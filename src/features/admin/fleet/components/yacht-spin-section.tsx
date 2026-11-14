"use client";

import { useEffect, useRef, useState } from "react";

import { BODY, MUTED } from "@/components/admin/admin-theme";
import {
  input,
  Label,
  LoadState,
  Notice,
  OUTLINE_STYLE,
  PRIMARY_STYLE,
  SelectBox,
  Toggle,
} from "@/components/admin/form-parts";
import { smallOutline, smallPrimary } from "@/features/admin/bookings/components/booking-ui";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { cx } from "@/lib/cx";
import { isApiError } from "@/services/http/api-error";
import { uploadSpinVideo } from "@/services/admin/media.service";
import {
  attachYachtSpin,
  deleteYachtSpin,
  getPublicYachtSpin,
  getYachtSpin,
  SPIN_FRAMES_DEFAULT,
  updateYachtSpin,
  type SpinLive,
  type SpinStatus,
} from "@/services/admin/yacht-spin.service";

import {
  checkSpinVideo,
  formatMegabytes,
  formatSeconds,
  SPIN_FRAME_OPTIONS,
  spinErrorMessage,
} from "../utils/yacht-spin";
import { SpinViewer, type SpinSize } from "./spin-viewer";

/** How often to ask whether a video has finished processing. */
const POLL_MS = 4_000;

/** A video chosen before the yacht exists; uploaded once it's created. */
export interface QueuedSpin {
  file: File;
  frameCount: number;
  seconds: number | null;
}

type Props =
  | { mode: "queued"; value: QueuedSpin | null; onChange: (value: QueuedSpin | null) => void }
  | { mode: "live"; yachtId: string; slug: string };

const ACCEPT = "video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm,.m4v";

/**
 * "360° view": an optional video turned into a drag-to-turn view. New yacht:
 * the video waits here and is uploaded after the yacht is created. Existing
 * yacht: POST /admin/media/uploads (yacht_spin_video), PUT to the signed link,
 * PUT /admin/yachts/{id}/spin, then GET …/spin until it's ready.
 */
export function YachtSpinSection(props: Props) {
  return (
    <div className="mt-[32px] border-t border-[#e3e1dc] pt-[26px]">
      <h3 className="text-[18px] leading-[24px]">360° view</h3>
      <p className="mt-[6px] text-[12px] leading-[18px]" style={{ color: BODY }}>
        Optional. Film one slow, steady turn around the yacht: MP4, MOV or WebM, 2–60 seconds, up to
        200 MB. It’s cut into frames that guests drag to turn.
      </p>
      {props.mode === "queued" ? (
        <QueuedSpinPicker value={props.value} onChange={props.onChange} />
      ) : (
        <LiveSpin yachtId={props.yachtId} slug={props.slug} />
      )}
    </div>
  );
}

function FramesSelect({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="max-w-[280px]">
      <Label htmlFor={id} hint="more frames turn more smoothly">
        Frames
      </Label>
      <SelectBox
        id={id}
        value={String(value)}
        disabled={disabled}
        onChange={(v) => onChange(Number(v))}
        options={SPIN_FRAME_OPTIONS.map((n) => ({
          value: String(n),
          label: n === SPIN_FRAMES_DEFAULT ? `${n} (default)` : String(n),
        }))}
      />
    </div>
  );
}

/** The file button, shared by both modes. */
function PickButton({
  label,
  disabled,
  onPick,
}: {
  label: string;
  disabled?: boolean;
  onPick: (file: File) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => fileInput.current?.click()}
        className={cx(smallOutline, "min-w-[170px]")}
        style={OUTLINE_STYLE}
      >
        {label}
      </button>
      <input
        ref={fileInput}
        type="file"
        accept={ACCEPT}
        hidden
        aria-label="360° video"
        onChange={(e) => {
          const file = e.currentTarget.files?.[0];
          e.currentTarget.value = "";
          if (file) onPick(file);
        }}
      />
    </>
  );
}

/* New yacht ------------------------------------------------------------ */

function QueuedSpinPicker({
  value,
  onChange,
}: {
  value: QueuedSpin | null;
  onChange: (value: QueuedSpin | null) => void;
}) {
  const [problem, setProblem] = useState("");
  const [checking, setChecking] = useState(false);

  async function pick(file: File) {
    setChecking(true);
    setProblem("");
    const { problem: rejected, seconds } = await checkSpinVideo(file);
    setChecking(false);
    if (rejected) return setProblem(rejected);
    onChange({ file, frameCount: value?.frameCount ?? SPIN_FRAMES_DEFAULT, seconds });
  }

  return (
    <div className="mt-[16px] grid gap-[16px]">
      {value && (
        <p className="text-[13px] break-words">
          {value.file.name}
          <span style={{ color: MUTED }}>
            {" "}
            · {formatMegabytes(value.file.size)}
            {value.seconds !== null && ` · ${formatSeconds(value.seconds)}`} · uploaded when the
            yacht is saved
          </span>
        </p>
      )}
      {value && (
        <FramesSelect
          id="spin-frames-new"
          value={value.frameCount}
          onChange={(frameCount) => onChange({ ...value, frameCount })}
        />
      )}
      {problem && <Notice tone="error">{problem}</Notice>}
      <div className="flex flex-wrap items-center gap-[14px]">
        <PickButton
          label={checking ? "Checking video…" : value ? "Choose another video" : "Add 360° video"}
          disabled={checking}
          onPick={(f) => void pick(f)}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-[12px] underline underline-offset-2"
          >
            Remove video
          </button>
        )}
      </div>
    </div>
  );
}

/* Existing yacht ------------------------------------------------------- */

const isWorking = (s: SpinStatus | undefined) =>
  s?.attempt?.status === "pending" || s?.attempt?.status === "processing";

function LiveSpin({ yachtId, slug }: { yachtId: string; slug: string }) {
  const spin = useAdminQuery((signal) => getYachtSpin(yachtId, signal), `spin:${yachtId}`);
  const { data: s, setData } = spin;
  const [frames, setFrames] = useState(SPIN_FRAMES_DEFAULT);
  const [upload, setUpload] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState("");
  const [notice, setNotice] = useState("");
  const [retry, setRetry] = useState(0);
  const working = isWorking(s);

  // While a video is processing, check again every few seconds.
  useEffect(() => {
    if (!working) return;
    const timer = setTimeout(() => {
      getYachtSpin(yachtId).then(
        (fresh) => {
          setData(fresh);
          if (!isWorking(fresh) && !fresh.attempt && fresh.live)
            setNotice("The new 360° view is ready and live on the website.");
        },
        () => setRetry((n) => n + 1), // a missed check is tried again
      );
    }, POLL_MS);
    return () => clearTimeout(timer);
  }, [working, s, retry, yachtId, setData]);

  async function start(file: File) {
    setProblem("");
    setNotice("");
    setBusy(true);
    const { problem: rejected } = await checkSpinVideo(file);
    if (rejected) {
      setBusy(false);
      return setProblem(rejected);
    }
    setUpload(0);
    try {
      const mediaId = await uploadSpinVideo(file, setUpload);
      setUpload(null);
      const fresh = await attachYachtSpin(yachtId, mediaId, frames);
      setData(fresh);
      setNotice(
        fresh.live
          ? "Processing the new video. The current 360° view stays live until the new one is ready."
          : "Processing the video. This can take a few minutes; you can keep working.",
      );
    } catch (err) {
      setProblem(spinErrorMessage(err));
    } finally {
      setUpload(null);
      setBusy(false);
    }
  }

  /**
   * The frames the website shows (GET /yachts/{slug}/spin, sized for the
   * screen). A hidden or inactive yacht isn't public, so its admin preview
   * frames (small) are used instead.
   */
  async function loadFrames(size: SpinSize): Promise<string[]> {
    try {
      return (await getPublicYachtSpin(slug, size)).frames.map((f) => f.url);
    } catch (err) {
      if (!isApiError(err) || err.status !== 404) throw err;
      return (await getYachtSpin(yachtId)).live?.preview_frames ?? [];
    }
  }

  async function remove() {
    if (!window.confirm("Remove the 360° view from the website? This can’t be undone.")) return;
    setBusy(true);
    setProblem("");
    setNotice("");
    try {
      await deleteYachtSpin(yachtId);
      setData(await getYachtSpin(yachtId));
      setNotice("360° view removed.");
    } catch (err) {
      setProblem(spinErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!s)
    return (
      <div className="mt-[16px]">
        <LoadState
          loading={spin.loading}
          error={
            spin.error ? `Couldn't load the 360° view. ${spinErrorMessage(spin.error)}` : undefined
          }
          onRetry={spin.reload}
          label="Loading 360° view"
        />
      </div>
    );

  const attempt = s.attempt;
  return (
    <div className="mt-[16px] grid gap-[16px]" aria-busy={busy || working}>
      {s.live ? (
        <>
          <SpinViewer
            key={`viewer:${s.live.id}`}
            viewKey={`${s.live.id}:${s.live.first_frame}:${s.live.reverse}`}
            loadFrames={loadFrames}
            label="360° preview"
          />
          <p className="text-[12px]" style={{ color: MUTED }}>
            Live on the website · {s.live.frame_count} frames
          </p>
          <SpinAdjust
            key={`adjust:${s.live.id}:${s.live.first_frame}:${s.live.reverse}`}
            yachtId={yachtId}
            live={s.live}
            disabled={busy}
            onSaved={(fresh) => {
              setData(fresh);
              setProblem("");
              setNotice("Starting view saved.");
            }}
            onError={(err) => setProblem(spinErrorMessage(err))}
          />
        </>
      ) : (
        !attempt && (
          <p className="text-[13px]" style={{ color: BODY }}>
            No 360° view yet.
          </p>
        )
      )}

      {attempt && working && (
        <Notice>
          {attempt.status === "pending" ? "Waiting to process" : "Processing"} the{" "}
          {s.live ? "new " : ""}video ({attempt.frame_count} frames)…
          {s.live ? " The current view stays live until it’s ready." : ""}
        </Notice>
      )}
      {attempt?.status === "failed" && (
        <Notice tone="error">
          The {s.live ? "new " : ""}video couldn’t be processed
          {attempt.error ? `: ${attempt.error}` : "."} Upload another video to try again.
          {s.live ? " The current view is still live." : ""}
        </Notice>
      )}
      {upload !== null && (
        <div role="status" aria-label="Uploading the video">
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
      {notice && <Notice>{notice}</Notice>}
      {problem && <Notice tone="error">{problem}</Notice>}

      <FramesSelect id="spin-frames" value={frames} onChange={setFrames} disabled={busy} />
      <div className="flex flex-wrap items-center gap-[14px]">
        <PickButton
          label={
            busy && upload !== null
              ? "Uploading…"
              : busy
                ? "Checking video…"
                : s.live || attempt
                  ? "Replace video"
                  : "Upload 360° video"
          }
          disabled={busy || working}
          onPick={(f) => void start(f)}
        />
        {s.live && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void remove()}
            className="text-[12px] underline underline-offset-2 disabled:opacity-50"
          >
            Remove 360° view
          </button>
        )}
      </div>
      {working && (
        <p className="text-[11px]" style={{ color: MUTED }}>
          A new video can be uploaded once this one has finished.
        </p>
      )}
    </div>
  );
}

/** Which frame the view starts on, and which way it turns (PATCH …/spin). */
function SpinAdjust({
  yachtId,
  live,
  disabled,
  onSaved,
  onError,
}: {
  yachtId: string;
  live: SpinLive;
  disabled?: boolean;
  onSaved: (s: SpinStatus) => void;
  onError: (err: unknown) => void;
}) {
  const [first, setFirst] = useState(String(live.first_frame));
  const [reverse, setReverse] = useState(live.reverse);
  const [saving, setSaving] = useState(false);
  const n = Number(first);
  const valid = Number.isInteger(n) && n >= 1 && n <= live.frame_count;
  const changed = n !== live.first_frame || reverse !== live.reverse;

  async function save() {
    if (!valid || !changed) return;
    setSaving(true);
    try {
      onSaved(
        await updateYachtSpin(yachtId, {
          ...(n !== live.first_frame ? { first_frame: n } : {}),
          ...(reverse !== live.reverse ? { reverse } : {}),
        }),
      );
    } catch (err) {
      onError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-[14px] sm:grid-cols-2 sm:items-end">
      <div>
        <Label htmlFor="spin-first-frame" hint={`1–${live.frame_count}, in filming order`}>
          Starting frame
        </Label>
        <input
          id="spin-first-frame"
          type="number"
          inputMode="numeric"
          min={1}
          max={live.frame_count}
          value={first}
          disabled={disabled || saving}
          onChange={(e) => setFirst(e.currentTarget.value)}
          className={input}
          aria-invalid={!valid || undefined}
        />
      </div>
      <Toggle
        id="spin-reverse"
        label="Reverse rotation"
        text="For a video filmed anticlockwise"
        checked={reverse}
        disabled={disabled || saving}
        onChange={setReverse}
      />
      <div className="sm:col-span-2">
        <button
          type="button"
          disabled={disabled || saving || !valid || !changed}
          onClick={() => void save()}
          className={cx(smallPrimary, "min-w-[170px]")}
          style={PRIMARY_STYLE}
        >
          {saving ? "Saving…" : "Save starting view"}
        </button>
        {!valid && (
          <p className="mt-[6px] text-[12px] text-[#9b2c2c]">
            Enter a frame from 1 to {live.frame_count}.
          </p>
        )}
      </div>
    </div>
  );
}
