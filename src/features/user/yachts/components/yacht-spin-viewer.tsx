"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";

import { cx } from "@/lib/cx";

import {
  knownWithoutSpin,
  loadYachtSpin,
  releaseYachtSpin,
  spinSizeForScreen,
  type SpinSize,
} from "../utils/spin-preload";

/** How far a drag moves before the yacht turns by one frame. */
const PX_PER_FRAME = 8;

type Phase = "loading" | "ready" | "none";

/**
 * A yacht's 360° view, drawn on a canvas from frames held in memory: every
 * frame is downloaded and decoded before it's shown, so turning never makes a
 * request.
 *
 * The yacht remains stationary when opened. Visitors explore by clicking and
 * dragging left or right (mouse or touch), or using arrow keys. Automatic rotation
 * is completely disabled.
 */
export function YachtSpinViewer({
  slug,
  name,
  fit = "contain",
  fill = false,
  releaseOnUnmount = true,
  showGuide = false,
  onReady,
  onUnavailable,
  loading,
  className,
}: {
  slug: string;
  name: string;
  /** Kept for compatibility; rotation is disabled and interaction is drag-only. */
  mode?: "drag" | "rotate";
  /** "cover" fills the area (hero); "contain" shows the whole frame. */
  fit?: "cover" | "contain";
  /** Fill the positioned parent (e.g. a carousel slide) instead of sizing itself. */
  fill?: boolean;
  /** Free the frames when this closes; off when they should stay for reopening. */
  releaseOnUnmount?: boolean;
  /** Show the initial guidance animation and hint when opened. */
  showGuide?: boolean;
  onReady?: () => void;
  onUnavailable?: () => void;
  /** Shown while the frames load, given the percentage. */
  loading?: (percent: number) => React.ReactNode;
  className?: string;
}) {
  const [size] = useState<SpinSize>(spinSizeForScreen);
  const [phase, setPhase] = useState<Phase>(() => (knownWithoutSpin(slug) ? "none" : "loading"));
  const [percent, setPercent] = useState(0);
  const [frameCount, setFrameCount] = useState(0);
  const [index, setIndex] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isPointerDown, setIsPointerDown] = useState(false);

  const canvas = useRef<HTMLCanvasElement>(null);
  const order = useRef<HTMLImageElement[]>([]);
  const drag = useRef<{ x: number; start: number } | null>(null);
  const callbacks = useRef({ onReady, onUnavailable });
  useEffect(() => {
    callbacks.current = { onReady, onUnavailable };
  });

  const count = phase === "ready" ? frameCount : 0;
  const at = count ? ((index % count) + count) % count : 0;

  const draw = useCallback(
    (i: number) => {
      const el = canvas.current;
      const frames = order.current;
      if (!el || frames.length === 0) return;
      const img = frames[((i % frames.length) + frames.length) % frames.length];
      const ctx = el.getContext("2d");
      if (!img || !ctx) return;
      const pick = fit === "cover" ? Math.max : Math.min;
      const scale = pick(el.width / img.naturalWidth, el.height / img.naturalHeight);
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      ctx.clearRect(0, 0, el.width, el.height);
      ctx.drawImage(img, (el.width - w) / 2, (el.height - h) / 2, w, h);
    },
    [fit],
  );

  // Load (or join the preload of) every frame, then show it.
  useEffect(() => {
    if (knownWithoutSpin(slug)) {
      callbacks.current.onUnavailable?.();
      return;
    }
    let active = true;
    const job = loadYachtSpin(slug, size);
    const onProgress = () => {
      const { done, total } = job.progress;
      if (active) setPercent(total ? Math.round((done / total) * 100) : 0);
    };
    job.listeners.add(onProgress);
    onProgress();
    job.promise.then(
      (frames) => {
        if (!active) return;
        order.current = frames;
        setFrameCount(frames.length);
        setIndex(0);
        setPhase("ready");
        callbacks.current.onReady?.();
      },
      () => {
        if (!active) return;
        setPhase("none");
        callbacks.current.onUnavailable?.();
      },
    );
    return () => {
      active = false;
      job.listeners.delete(onProgress);
      order.current = [];
      if (releaseOnUnmount) releaseYachtSpin(slug, size);
    };
  }, [slug, size, releaseOnUnmount]);

  // Keep the canvas sharp at its displayed size.
  useEffect(() => {
    const el = canvas.current;
    if (!el || phase !== "ready") return;
    const fitCanvas = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      el.width = Math.round(el.clientWidth * ratio);
      el.height = Math.round(el.clientHeight * ratio);
      draw(at);
    };
    const observer = new ResizeObserver(fitCanvas);
    observer.observe(el);
    fitCanvas();
    return () => observer.disconnect();
    // Only on readiness; turning redraws below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, draw]);

  // Draw the frame when `at` changes.
  useEffect(() => {
    if (phase === "ready") draw(at);
  }, [at, phase, draw]);

  if (phase === "none") return null;

  const ready = phase === "ready";
  const dragging = ready;

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setHasInteracted(true);
    setIsPointerDown(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    drag.current = { x: e.clientX, start: at };
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    setHasInteracted(true);
    // Dragging left turns the yacht clockwise, as if spinning it by hand.
    const newIndex = drag.current.start + Math.round((drag.current.x - e.clientX) / PX_PER_FRAME);
    const newAt = count ? ((newIndex % count) + count) % count : 0;
    draw(newAt);
    setIndex(newIndex);
  };

  const stop = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current) {
      drag.current = null;
      setIsPointerDown(false);
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {}
    }
  };

  return (
    <div className={cx(fill ? "absolute inset-0" : "relative", className)}>
      <div
        role="img"
        aria-label={
          !ready ? `Loading the 360° view of ${name}` : `${name} in 360°: drag to turn the yacht.`
        }
        aria-busy={!ready}
        tabIndex={dragging ? 0 : -1}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stop}
        onPointerCancel={stop}
        // Turning shouldn't also swipe a carousel this sits in.
        onTouchStart={(e) => dragging && e.stopPropagation()}
        onTouchEnd={(e) => dragging && e.stopPropagation()}
        onKeyDown={(e) => {
          if (dragging && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
            setHasInteracted(true);
            const next = at + (e.key === "ArrowRight" ? 1 : -1);
            const nextAt = count ? ((next % count) + count) % count : 0;
            draw(nextAt);
            setIndex(next);
          }
        }}
        className={cx(
          "absolute inset-0 select-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white",
          dragging
            ? isPointerDown
              ? "cursor-grabbing touch-none"
              : "cursor-grab touch-none"
            : "pointer-events-none",
        )}
      >
        <canvas
          ref={canvas}
          className={cx(
            "pointer-events-none h-full w-full transition-opacity duration-500 motion-reduce:transition-none",
            ready ? "opacity-100" : "opacity-0",
          )}
        />
      </div>

      {ready && showGuide && (
        <div
          aria-hidden="true"
          className={cx(
            "pointer-events-none absolute bottom-8 sm:bottom-12 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center select-none transition-all duration-300",
            hasInteracted ? "opacity-0 translate-y-3" : "opacity-100 translate-y-0",
          )}
        >
          <div className="flex items-center gap-3 rounded-full bg-[#0d1b2a]/90 text-white px-5 py-3 sm:px-6 sm:py-3.5 shadow-2xl backdrop-blur-md border border-white/10">
            <div
              className="flex items-center gap-1.5"
              style={{ animation: "yachtSpinMouseGuide 2s ease-in-out infinite" }}
            >
              <svg
                viewBox="0 0 8 14"
                fill="none"
                className="h-3 w-auto stroke-white/60"
                strokeWidth="1.5"
              >
                <path d="M6.5 2L1.5 7L6.5 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <svg
                viewBox="0 0 24 36"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-auto stroke-white"
                strokeWidth="1.75"
              >
                <rect x="2" y="2" width="20" height="32" rx="10" />
                <line x1="12" y1="8" x2="12" y2="13" strokeLinecap="round" />
              </svg>
              <svg
                viewBox="0 0 8 14"
                fill="none"
                className="h-3 w-auto stroke-white/60"
                strokeWidth="1.5"
              >
                <path d="M1.5 2L6.5 7L1.5 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-[12px] sm:text-[13px] font-medium tracking-[0.03em] whitespace-nowrap text-white/95">
              Move your mouse to explore the yacht in 360°
            </span>
          </div>
          <style>{`
            @keyframes yachtSpinMouseGuide {
              0%, 100% { transform: translateX(0); }
              25% { transform: translateX(-8px); }
              75% { transform: translateX(8px); }
            }
          `}</style>
        </div>
      )}

      {!ready && loading?.(percent)}
    </div>
  );
}
