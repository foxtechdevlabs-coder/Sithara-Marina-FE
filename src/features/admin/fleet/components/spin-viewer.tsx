"use client";

import { useCallback, useEffect, useId, useRef, useState, type PointerEvent } from "react";

import { BODY, MUTED, SAND } from "@/components/admin/admin-theme";
import { OUTLINE_STYLE } from "@/components/admin/form-parts";
import { smallOutline } from "@/features/admin/bookings/components/booking-ui";

import { forgetFrameList, frameId, frameList, loadImageWithRetry } from "@/lib/spin-frames";

/** How far a drag moves before the view turns by one frame. */
const PX_PER_FRAME = 8;

export type SpinSize = "large" | "small";

/**
 * A 360° view: every frame is downloaded and decoded first (with progress),
 * then drawn on a canvas from memory, so dragging never makes a request.
 *
 * `loadFrames` returns the signed frame links in display order; it's called
 * once when the viewer opens (shared by viewers of the same `viewKey`), and
 * again only if the links have expired or a frame won't load.
 */
export function SpinViewer({
  label,
  viewKey,
  loadFrames,
}: {
  label: string;
  /** Identifies this view and its settings, e.g. spin id + starting frame + direction. */
  viewKey: string;
  loadFrames: (size: SpinSize) => Promise<string[]>;
}) {
  const sliderId = useId();
  // Small frames on phones, large on bigger screens; chosen once, when the viewer opens.
  const [size] = useState<SpinSize>(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
      ? "small"
      : "large",
  );
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [index, setIndex] = useState(0);
  const [attempt, setAttempt] = useState(0);
  /** How many frames are ready to draw. */
  const [frameCount, setFrameCount] = useState(0);

  const canvas = useRef<HTMLCanvasElement>(null);
  /** Decoded frames by identity: kept for the viewer's life, reused when links are re-signed. */
  const images = useRef(new Map<string, HTMLImageElement>());
  /** The frames in display order, ready to draw. */
  const order = useRef<HTMLImageElement[]>([]);
  const drag = useRef<{ x: number; start: number } | null>(null);
  const loadRef = useRef(loadFrames);
  useEffect(() => {
    loadRef.current = loadFrames;
  });

  const count = phase === "ready" ? frameCount : 0;
  const at = count ? ((index % count) + count) % count : 0;

  /** Draws frame `i` from memory, fitted inside the canvas. */
  const draw = useCallback((i: number) => {
    const el = canvas.current;
    const img = order.current[i];
    const ctx = el?.getContext("2d");
    if (!el || !img || !ctx) return;
    const scale = Math.min(el.width / img.naturalWidth, el.height / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    ctx.clearRect(0, 0, el.width, el.height);
    ctx.drawImage(img, (el.width - w) / 2, (el.height - h) / 2, w, h);
  }, []);

  // Load the list once, then every frame; nothing more is fetched while turning.
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const listKey = `${viewKey}:${size}`;
    const cache = images.current;

    async function loadAll(urls: string[]) {
      let done = urls.filter((u) => cache.has(frameId(u))).length;
      setProgress({ done, total: urls.length });
      const missing = urls.filter((u) => !cache.has(frameId(u)));
      const results = await Promise.allSettled(
        missing.map(async (url) => {
          const img = await loadImageWithRetry(url, signal);
          cache.set(frameId(url), img);
          done += 1;
          if (!signal.aborted) setProgress({ done, total: urls.length });
        }),
      );
      return results.some((r) => r.status === "rejected");
    }

    (async () => {
      setPhase("loading");
      try {
        let urls = await frameList(listKey, () => loadRef.current(size));
        if (signal.aborted) return;
        if (!urls.length) throw new Error("No frames");
        let failed = await loadAll(urls);
        if (signal.aborted) return;
        if (failed) {
          // Most likely expired links: ask once for freshly signed ones and try the rest again.
          forgetFrameList(listKey);
          urls = await frameList(listKey, () => loadRef.current(size));
          if (signal.aborted) return;
          failed = await loadAll(urls);
          if (signal.aborted) return;
        }
        if (failed) throw new Error("Some frames failed to load");
        order.current = urls.map((u) => cache.get(frameId(u))!);
        setFrameCount(urls.length);
        setIndex(0);
        setPhase("ready");
      } catch {
        if (!signal.aborted) setPhase("error");
      }
    })();
    return () => controller.abort(); // stops downloads still running
  }, [viewKey, size, attempt]);

  // Free the decoded frames when the viewer closes.
  useEffect(() => {
    const cache = images.current;
    return () => {
      cache.clear();
      order.current = [];
    };
  }, []);

  // Keep the canvas sharp at its displayed size.
  useEffect(() => {
    const el = canvas.current;
    if (!el || phase !== "ready") return;
    const fit = () => {
      const ratio = window.devicePixelRatio || 1;
      el.width = Math.round(el.clientWidth * ratio);
      el.height = Math.round(el.clientHeight * ratio);
      draw(at);
    };
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    fit();
    return () => observer.disconnect();
    // Only on readiness; turning redraws below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, draw]);

  useEffect(() => {
    if (phase === "ready") draw(at);
  }, [at, phase, draw]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (phase !== "ready") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, start: at };
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    // Dragging left turns the yacht clockwise, like spinning it by hand.
    setIndex(drag.current.start + Math.round((drag.current.x - e.clientX) / PX_PER_FRAME));
  };
  const stop = () => {
    drag.current = null;
  };

  const ready = phase === "ready";
  const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
  return (
    <div>
      <div
        role="img"
        aria-label={
          ready
            ? `${label}: frame ${at + 1} of ${count}. Drag to turn.`
            : `${label}: loading frames`
        }
        aria-busy={!ready}
        tabIndex={ready ? 0 : -1}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stop}
        onPointerCancel={stop}
        onKeyDown={(e) => {
          if (!ready) return;
          if (e.key === "ArrowRight") setIndex(at + 1);
          if (e.key === "ArrowLeft") setIndex(at - 1);
        }}
        className={`relative aspect-[16/9] w-full touch-none overflow-hidden select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d1b2a] ${ready ? "cursor-grab active:cursor-grabbing" : ""}`}
        style={{ backgroundColor: SAND }}
      >
        {ready && <canvas ref={canvas} className="pointer-events-none h-full w-full" />}
        {phase === "loading" && (
          <div
            role="status"
            className="absolute inset-0 flex flex-col items-center justify-center gap-[10px] px-[20px]"
          >
            <p className="text-[12px]" style={{ color: BODY }}>
              Loading 360° view
              {progress.total ? ` · ${progress.done} of ${progress.total} frames` : "…"}
            </p>
            <div className="h-[4px] w-full max-w-[260px] bg-white/70">
              <div
                className="h-full bg-[#0d1b2a] transition-[width]"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )}
        {phase === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-[12px] px-[20px] text-center">
            <p role="alert" className="text-[12px]" style={{ color: BODY }}>
              The 360° view couldn’t be loaded.
            </p>
            <button
              type="button"
              onClick={() => {
                forgetFrameList(`${viewKey}:${size}`);
                setAttempt((n) => n + 1);
              }}
              className={smallOutline}
              style={OUTLINE_STYLE}
            >
              Try again
            </button>
          </div>
        )}
        {ready && (
          <span
            className="absolute right-[10px] bottom-[10px] bg-white/85 px-[8px] py-[2px] text-[11px]"
            style={{ color: MUTED }}
          >
            {at + 1} / {count}
          </span>
        )}
      </div>
      <label htmlFor={sliderId} className="sr-only">
        Turn the 360° view
      </label>
      <input
        id={sliderId}
        type="range"
        min={0}
        max={Math.max(count - 1, 0)}
        value={at}
        disabled={!ready}
        onChange={(e) => setIndex(Number(e.currentTarget.value))}
        className="mt-[10px] w-full accent-[#0d1b2a] disabled:opacity-40"
      />
    </div>
  );
}
