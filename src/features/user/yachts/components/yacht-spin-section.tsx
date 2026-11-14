"use client";

import { Rotate3d, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { INK, SANS, SERIF } from "@/components/user/marina-chrome";

import { loadYachtSpin, releaseYachtSpin, spinSizeForScreen } from "../utils/spin-preload";
import { YachtSpinViewer } from "./yacht-spin-viewer";

/**
 * "View in 360°" button and modal on the yacht details page (only for yachts with `has_spin`).
 * Placed on the top-right side of the yacht hero image, mirroring the region badge.
 * Features an eye-catching highlight animation on the button text.
 * Opens an interactive full-screen viewer where the yacht is stationary and users can drag to explore.
 */
export function YachtSpinSection({
  slug,
  name,
  className,
}: {
  slug: string;
  name: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [size] = useState(spinSizeForScreen);
  const button = useRef<HTMLButtonElement>(null);

  // Free the frames when leaving the page.
  useEffect(() => () => releaseYachtSpin(slug, size), [slug, size]);

  if (unavailable) return null;

  const preload = () => {
    loadYachtSpin(slug, size).promise.catch(() => setUnavailable(true));
  };

  return (
    <div className={className}>
      <button
        ref={button}
        type="button"
        onPointerEnter={preload}
        onFocus={preload}
        onTouchStart={preload}
        onClick={() => setOpen(true)}
        className="group relative inline-flex h-[35px] items-center gap-[10px] sm:gap-[12px] overflow-hidden bg-white px-[16px] sm:px-[20px] text-[12px] sm:text-[13px] tracking-[0.18em] uppercase shadow-[0_4px_20px_rgba(0,0,0,0.12)] transition-colors duration-300 hover:bg-[#0d1b2a] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0d1b2a]"
        style={SANS}
      >
        {/* Subtle light sweep across the button surface */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:via-white/10"
          style={{ animation: "buttonHighlightSheen 3.2s ease-in-out infinite" }}
        />

        <Rotate3d
          aria-hidden="true"
          strokeWidth={1.35}
          className="relative z-10 size-4 sm:size-[18px] text-[#0d1b2a] transition-all duration-300 group-hover:rotate-90 group-hover:text-white"
        />

        {/* Animated highlighting text */}
        <span className="relative z-10 inline-block font-medium">
          <span className="yacht-360-text-highlight transition-colors duration-300">
            View in 360°
          </span>
          {/* Subtle highlighter marker beam underneath */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-[2px] left-0 h-[2px] w-full rounded-full bg-gradient-to-r from-sky-400 via-blue-600 to-sky-400 opacity-80"
            style={{
              backgroundSize: "200% 100%",
              animation: "markerHighlightSweep 2.5s ease-in-out infinite",
            }}
          />
        </span>
      </button>

      <style>{`
        @keyframes textHighlightSweep {
          0% {
            background-position: 200% center;
          }
          100% {
            background-position: -200% center;
          }
        }
        @keyframes markerHighlightSweep {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
        @keyframes buttonHighlightSheen {
          0%, 20% {
            transform: translateX(-100%);
          }
          60%, 100% {
            transform: translateX(100%);
          }
        }
        .yacht-360-text-highlight {
          background: linear-gradient(
            90deg,
            #0d1b2a 0%,
            #0d1b2a 30%,
            #2563eb 45%,
            #60a5fa 50%,
            #2563eb 55%,
            #0d1b2a 70%,
            #0d1b2a 100%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: textHighlightSweep 2.5s ease-in-out infinite;
        }
        .group:hover .yacht-360-text-highlight {
          background: linear-gradient(
            90deg,
            #ffffff 0%,
            #ffffff 30%,
            #93c5fd 45%,
            #e0f2fe 50%,
            #93c5fd 55%,
            #ffffff 70%,
            #ffffff 100%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>

      {open && (
        <SpinDialog
          slug={slug}
          name={name}
          onClose={() => {
            setOpen(false);
            button.current?.focus();
          }}
          onUnavailable={() => {
            setOpen(false);
            setUnavailable(true);
          }}
        />
      )}
    </div>
  );
}

function SpinDialog({
  slug,
  name,
  onClose,
  onUnavailable,
}: {
  slug: string;
  name: string;
  onClose: () => void;
  onUnavailable: () => void;
}) {
  const closeButton = useRef<HTMLButtonElement>(null);

  // A modal: focus inside, Escape closes, the page behind doesn't scroll.
  useEffect(() => {
    closeButton.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="yacht-spin-title"
      className="fixed inset-0 z-[100] flex flex-col bg-white antialiased"
      style={{ ...SANS, color: INK }}
    >
      <div className="flex items-start justify-between gap-6 px-5 pt-6 lg:px-[100px] lg:pt-[37px]">
        <div>
          <p className="text-[11px] tracking-[0.2em] text-[#7a7f85] uppercase">360° view</p>
          <h2
            id="yacht-spin-title"
            className="mt-[10px] text-[32px] leading-[1.1] tracking-[-1px] lg:text-[48px] lg:tracking-[-1.5px]"
          >
            {name} <span style={SERIF}>from every angle.</span>
          </h2>
        </div>
        <button
          ref={closeButton}
          type="button"
          onClick={onClose}
          aria-label="Close the 360° view"
          className="flex size-12 shrink-0 items-center justify-center rounded-full border border-[#0d1b2a] transition-colors hover:bg-[#0d1b2a] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0d1b2a]"
        >
          <X aria-hidden="true" strokeWidth={1.25} className="size-5" />
        </button>
      </div>
      <YachtSpinViewer
        slug={slug}
        name={name}
        showGuide
        // The section keeps the frames, so opening it again is instant.
        releaseOnUnmount={false}
        onUnavailable={onUnavailable}
        loading={(percent) => (
          <div
            role="status"
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8"
          >
            <p className="text-[11px] tracking-[0.2em] text-[#7a7f85] uppercase">
              Preparing the view · {percent}%
            </p>
            <div className="h-px w-full max-w-[280px] bg-[#e5e7eb]">
              <div
                className="h-full bg-[#0d1b2a] transition-[width] duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )}
        className="mx-5 mt-4 mb-6 min-h-0 flex-1 lg:mx-[100px] lg:mb-[48px]"
      />
    </div>
  );
}
