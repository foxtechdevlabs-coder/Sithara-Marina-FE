"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, type TouchEvent } from "react";

/** Minimum horizontal travel (px) for a swipe to change the photo. */
const SWIPE = 50;

export interface LightboxPhoto {
  src: string;
  alt: string;
}

/**
 * Full-screen photo viewer. Esc or the backdrop closes it; the arrow keys,
 * buttons and a swipe move between photos, and the thumbnail strip shows every
 * photo and jumps to any of them.
 */
export function PhotoLightbox({
  photos,
  index,
  onIndexChange,
  onClose,
}: {
  photos: LightboxPhoto[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const activeThumb = useRef<HTMLButtonElement>(null);
  const touchX = useRef<number | null>(null);
  const photo = photos[index];
  const many = photos.length > 1;
  const go = (by: number) => onIndexChange((index + by + photos.length) % photos.length);

  // Keyboard, focus and page scroll while open.
  const goRef = useRef(go);
  const closeFn = useRef(onClose);
  useEffect(() => {
    goRef.current = go;
    closeFn.current = onClose;
  });
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeFn.current();
      else if (e.key === "ArrowLeft") goRef.current(-1);
      else if (e.key === "ArrowRight") goRef.current(1);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, []);

  // Keeps the current photo's thumbnail in view.
  useEffect(() => {
    activeThumb.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [index]);

  const onTouchStart = (e: TouchEvent) => {
    touchX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = touchX.current;
    const end = e.changedTouches[0]?.clientX;
    touchX.current = null;
    if (!many || start === null || end === undefined) return;
    if (Math.abs(end - start) >= SWIPE) go(end < start ? 1 : -1);
  };

  if (!photo) return null;

  const control =
    "flex size-[44px] items-center justify-center bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-white";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Photo ${index + 1} of ${photos.length}`}
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ backgroundColor: "#0a1a2c" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex items-center justify-between px-[16px] py-[12px] text-white">
        <p className="text-[12px] tracking-[0.12em] uppercase" aria-live="polite">
          {index + 1} / {photos.length}
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close full-screen photo"
          className={control}
        >
          <X aria-hidden="true" strokeWidth={1.5} className="size-[20px]" />
        </button>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-[16px] pb-[16px] sm:px-[72px]"
        onClick={(e) => e.target === e.currentTarget && onClose()}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- storage URLs and local previews */}
        <img
          src={photo.src}
          alt={photo.alt}
          className="max-h-full max-w-full object-contain shadow-2xl"
        />
        {many && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous photo"
              className={`${control} absolute left-[12px] top-1/2 -translate-y-1/2`}
            >
              <ChevronLeft aria-hidden="true" strokeWidth={1.5} className="size-[24px]" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next photo"
              className={`${control} absolute right-[12px] top-1/2 -translate-y-1/2`}
            >
              <ChevronRight aria-hidden="true" strokeWidth={1.5} className="size-[24px]" />
            </button>
          </>
        )}
      </div>

      {many && (
        <ul
          aria-label="All photos"
          className="flex shrink-0 gap-[8px] overflow-x-auto px-[16px] pb-[16px] [scrollbar-width:thin] sm:justify-center"
        >
          {photos.map((p, i) => (
            <li key={`${i}-${p.src}`} className="shrink-0">
              <button
                ref={i === index ? activeThumb : undefined}
                type="button"
                onClick={() => onIndexChange(i)}
                aria-label={`Photo ${i + 1} of ${photos.length}`}
                aria-current={i === index ? "true" : undefined}
                className={`block size-[56px] overflow-hidden border-2 transition-opacity focus-visible:outline-2 focus-visible:outline-white sm:size-[64px] ${
                  i === index
                    ? "border-white opacity-100"
                    : "border-transparent opacity-55 hover:opacity-90"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- storage URLs and local previews */}
                <img src={p.src} alt="" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
