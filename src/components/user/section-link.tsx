"use client";

import type { Route } from "next";
import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";

/**
 * Scrolls the page to the element with this id, below the fixed header. The
 * position is read from the layout (offsetTop), not the screen, so a heading
 * that is still mid scroll-in animation (shifted down until revealed) is not
 * overshot. The header's room comes from the page's `scroll-padding-top`
 * (`--site-header-h`). Returns false when there is no such element.
 */
export function scrollToSection(id: string): boolean {
  const target = document.getElementById(id);
  if (!target) return false;
  let top = 0;
  for (let node: HTMLElement | null = target; node; node = node.offsetParent as HTMLElement | null) {
    top += node.offsetTop;
  }
  const headerRoom = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: Math.max(0, top - headerRoom - 16), behavior: smooth ? "smooth" : "auto" });
  return true;
}

/**
 * A link to a home page section ("/#about-heading"). On the home page itself it
 * scrolls there directly, every time (a repeat click on the same section too);
 * from any other page it is an ordinary link, and the home page scrolls on arrival
 * (HomeSectionScroll).
 */
export function SectionLink({
  href,
  className,
  children,
}: {
  href: Route;
  className?: string;
  children: ReactNode;
}) {
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    const url = new URL(href, window.location.href);
    const id = decodeURIComponent(url.hash.slice(1));
    if (window.location.pathname !== url.pathname || !id) return; // navigate normally
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; // new tab etc.
    if (!scrollToSection(id)) return;
    event.preventDefault();
    window.history.replaceState(window.history.state, "", url.pathname + url.hash);
  };
  return (
    <Link href={href} scroll={false} onClick={onClick} className={className}>
      {children}
    </Link>
  );
}
