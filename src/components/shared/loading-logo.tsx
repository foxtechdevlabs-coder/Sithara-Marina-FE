import { useId } from "react";

import { cx } from "@/lib/cx";

import styles from "./loading-logo.module.css";
import { MARK_PATHS, WORDMARK_PATH } from "./logo-paths";

export interface LoadingLogoProps {
  /** Announced to screen readers. */
  label?: string;
  /**
   * `page` for a whole screen, `panel` for a section, `compact` (the mark only)
   * for a table row or list item.
   */
  size?: "page" | "panel" | "compact";
  /** `quick` finishes drawing in a second, for loaders that are only up that long. */
  speed?: "normal" | "quick";
  className?: string;
}

const INK = "#0c1923";

/**
 * The logo drawing itself, for as long as something is loading. The look of
 * `LogoLoader`, which is the once-only splash on first load. This one stays in
 * the page flow and runs until the parent removes it. It is CSS only, so it
 * works in a `loading.tsx` before any JavaScript has loaded.
 */
export function LoadingLogo({
  label = "Loading",
  size = "panel",
  speed = "normal",
  className,
}: LoadingLogoProps) {
  const clipPathId = `loading-logo-${useId().replace(/[^\w-]/g, "")}`;
  const compact = size === "compact";

  return (
    <span
      role="status"
      className={cx(styles.root, styles[size], speed === "quick" && styles.quick, className)}
    >
      <svg
        className={styles.logo}
        viewBox={compact ? "40 0 81 39" : "40 0 81 87"}
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <clipPath id={clipPathId}>
            <rect width="80.2784" height="39" transform="translate(40.1973)" />
          </clipPath>
        </defs>
        <g
          className={styles.strokeLayer}
          stroke={INK}
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
                style={{ animationDelay: `calc(var(--stagger) * ${index})` }}
              />
            ))}
          </g>
          {!compact && (
            <path
              d={WORDMARK_PATH}
              pathLength={1}
              style={{ animationDelay: `calc(var(--stagger) * ${MARK_PATHS.length + 1})` }}
            />
          )}
        </g>
        <g className={styles.fillLayer} fill={INK}>
          <g clipPath={`url(#${clipPathId})`}>
            {MARK_PATHS.map((d, index) => (
              <path key={index} d={d} />
            ))}
          </g>
          {!compact && <path d={WORDMARK_PATH} />}
        </g>
      </svg>
      {size === "page" && (
        <span aria-hidden="true" className={styles.caption}>
          LOADING
        </span>
      )}
      <span className="sr-only">{label}</span>
    </span>
  );
}
