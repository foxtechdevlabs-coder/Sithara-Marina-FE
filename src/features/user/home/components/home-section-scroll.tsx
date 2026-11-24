"use client";

import { useEffect } from "react";

import { scrollToSection } from "@/components/user/section-link";

/**
 * Arriving on the home page with a section in the address ("/#journal-heading",
 * e.g. from a footer link on another page): scrolls to that section once the page
 * has laid out, below the fixed header. Renders nothing.
 */
export function HomeSectionScroll() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    // Two frames: after the page's first layout, so the position is final.
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => scrollToSection(id));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, []);
  return null;
}
