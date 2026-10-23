"use client";

import { useEffect, useRef } from "react";

import { cx } from "@/lib/cx";

export interface HeroVideoProps {
  src: string;
  className?: string;
}

/**
 * Decorative, muted background video. Playback starts from JavaScript instead
 * of the `autoPlay` attribute so it can be skipped when the visitor prefers
 * reduced motion; the paused first frame (over the navy background) is then
 * the static fallback. If the browser blocks autoplay, the same still remains.
 */
export function HeroVideo({ src, className }: HeroVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPlayback = () => {
      if (reducedMotion.matches) {
        video.pause();
        return;
      }
      // Set the property explicitly: browsers only allow unattended playback when muted.
      video.muted = true;
      video.play().catch(() => {
        // Autoplay was blocked; the first frame stays visible and the page remains usable.
      });
    };

    syncPlayback();
    reducedMotion.addEventListener("change", syncPlayback);
    return () => reducedMotion.removeEventListener("change", syncPlayback);
  }, []);

  return (
    <video
      ref={videoRef}
      muted
      loop
      playsInline
      disablePictureInPicture
      preload="metadata"
      aria-hidden="true"
      tabIndex={-1}
      className={cx("pointer-events-none size-full object-cover", className)}
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}
