"use client";

import { useEffect, useId, useState, useSyncExternalStore } from "react";
import type { TransitionEvent } from "react";

import styles from "./logo-loader.module.css";
import { MARK_PATHS, WORDMARK_PATH } from "./logo-paths";

const LOGO_PATHS = [...MARK_PATHS, WORDMARK_PATH];
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

type LoadingPhase = "drawing" | "revealing" | "complete";

const subscribeToHydration = () => () => {};
const getHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

const subscribeToReducedMotion = (onStoreChange: () => void) => {
  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  mediaQuery.addEventListener("change", onStoreChange);
  return () => mediaQuery.removeEventListener("change", onStoreChange);
};

const getReducedMotionSnapshot = () => window.matchMedia(REDUCED_MOTION_QUERY).matches;
const getServerReducedMotionSnapshot = () => false;

export function LogoLoader() {
  const clipPathId = `logo-mark-${useId().replace(/:/g, "")}`;
  const isHydrated = useSyncExternalStore(
    subscribeToHydration,
    getHydrationSnapshot,
    getServerHydrationSnapshot,
  );
  const isReducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getServerReducedMotionSnapshot,
  );
  const [phase, setPhase] = useState<LoadingPhase>("drawing");
  const [isExited, setIsExited] = useState(false);
  const isStarted = isHydrated && !isReducedMotion;
  const visiblePhase = isReducedMotion ? "complete" : phase;
  const isReadyToExit = isHydrated && visiblePhase === "complete";
  const shouldHideImmediately = isReadyToExit && isReducedMotion;
  const isExiting = isReadyToExit && !isReducedMotion;
  const shouldShow = !isExited && !shouldHideImmediately;

  useEffect(() => {
    if (!shouldShow) return;

    const bodyOverflow = document.body.style.overflow;
    const documentOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = documentOverflow;
    };
  }, [shouldShow]);

  if (!shouldShow) return null;

  const handleDrawingEnd = () => setPhase("revealing");

  const handleFillEnd = () => setPhase("complete");

  const handleExitEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && event.propertyName === "opacity") {
      setIsExited(true);
    }
  };

  const phaseClass =
    visiblePhase === "revealing"
      ? styles.isRevealing
      : visiblePhase === "complete"
        ? styles.isComplete
        : "";

  return (
    <div
      className={`${styles.overlay} ${isExiting ? styles.isExiting : ""}`}
      role="status"
      aria-live="polite"
      aria-label="Loading Sithara Marina"
      aria-busy="true"
      aria-hidden={isExiting}
      onTransitionEnd={handleExitEnd}
    >
      <svg
        className={`${styles.logo} ${isStarted ? styles.isStarted : ""} ${phaseClass} ${isReducedMotion ? styles.reducedMotion : ""}`}
        viewBox="0 0 161 87"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <clipPath id={clipPathId}>
            <rect width="80.2784" height="39" fill="white" transform="translate(40.1973)" />
          </clipPath>
        </defs>
        <g
          className={styles.strokeLayer}
          stroke="#0c1923"
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <g clipPath={`url(#${clipPathId})`}>
            {MARK_PATHS.map((d, index) => (
              <path
                key={index}
                d={d}
                pathLength={1}
                style={{ animationDelay: `${index * 115}ms` }}
              />
            ))}
          </g>
          <path
            d={WORDMARK_PATH}
            pathLength={1}
            style={{ animationDelay: `${LOGO_PATHS.length * 115}ms` }}
            onAnimationEnd={handleDrawingEnd}
          />
        </g>
        <g className={styles.fillLayer} onAnimationEnd={handleFillEnd}>
          <g clipPath={`url(#${clipPathId})`}>
            {MARK_PATHS.map((d, index) => (
              <path key={index} d={d} fill="#0c1923" />
            ))}
          </g>
          <path d={WORDMARK_PATH} fill="#0c1923" />
        </g>
      </svg>
      <span className={`${styles.loadingLabel} ${isStarted ? styles.isStarted : ""}`}>LOADING</span>
    </div>
  );
}
