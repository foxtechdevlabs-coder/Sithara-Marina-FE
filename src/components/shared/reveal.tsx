"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type CSSProperties,
  type ElementType,
} from "react";

import { cx } from "@/lib/cx";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

type RevealTag = "div" | "li" | "h2" | "article" | "figure" | "details";

export type RevealProps<T extends RevealTag> = {
  /** The element to render; a `div` unless told otherwise. */
  as?: T;
  /** Milliseconds after its neighbours, to stagger cards in a row. */
  delay?: number;
} & ComponentPropsWithoutRef<T>;

/**
 * Fades its element up as it scrolls into view (styles in globals.css). Only an
 * element that starts below the fold is ever hidden, and only after hydration, so
 * the server HTML stays fully visible, nothing on screen flickers, and React keeps
 * control of the class. Reduced motion (or no IntersectionObserver) turns it off.
 */
export function Reveal<T extends RevealTag = "div">(props: RevealProps<T>) {
  // Every allowed tag shares these props; narrowed here so the generic stays simple.
  const { as, delay, className, style, ...rest } = props as RevealProps<"div"> & {
    as?: RevealTag;
  };
  const Tag = (as ?? "div") as ElementType;
  const ref = useRef<HTMLElement>(null);
  const [state, setState] = useState<"idle" | "pending" | "in">("idle");

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) return;

    let first = true;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (first) {
          first = false;
          // Already in view, or above it: leave it alone.
          if (entry.isIntersecting || entry.boundingClientRect.top < window.innerHeight) {
            observer.disconnect();
            return;
          }
          setState("pending");
          return;
        }
        if (entry.isIntersecting) {
          setState("in");
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      {...rest}
      ref={ref}
      data-reveal=""
      className={cx(className, state === "pending" && "reveal-pending", state === "in" && "reveal-in")}
      style={
        delay ? ({ ...style, "--reveal-delay": `${delay}ms` } as CSSProperties) : style
      }
    />
  );
}
