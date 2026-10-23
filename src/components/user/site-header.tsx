"use client";

import { BRAND_NAME } from "@/constants/brand";
import { ArrowRight, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { bookingNav, primaryNav } from "@/config/user-navigation";
import { userRoutes } from "@/constants/routes";
import { cx } from "@/lib/cx";

/** White artwork for the home hero; navy artwork for the light header on every other page. */
const LOGO_MARK_LIGHT_SRC = "/images/brand/sithara-marina-mark.png";
const LOGO_MARK_DARK_SRC = "/images/brand/sithara-marina-mark.svg";

const focusRingBase = "focus-visible:outline-2 focus-visible:outline-offset-4";

/**
 * Site-wide header: menu toggle on the left, logo centred, booking button on
 * the right. On the home page it floats transparently over the hero video with
 * white text and logo; on every other page it is a white bar with dark text,
 * as in the Figma designs.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const isOverlay = pathname === userRoutes.home;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuId = useId();
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const focusRing = cx(
    focusRingBase,
    isOverlay ? "focus-visible:outline-white" : "focus-visible:outline-brand-950",
  );

  useEffect(() => {
    if (!isMenuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setIsMenuOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [isMenuOpen]);

  const closeMenu = () => setIsMenuOpen(false);
  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      ref={headerRef}
      className={cx(
        "font-brand z-30 w-full",
        isOverlay ? "absolute inset-x-0 top-0 text-white" : "relative bg-white text-[#0d1b2a]",
      )}
    >
      <div
        className={cx(
          "relative flex h-24 items-start justify-between px-4 pt-5 sm:h-[7.5rem] sm:px-7 sm:pt-7 lg:pl-10",
          // Figma pages: the header block is 112px tall on the 1728px frame.
          isOverlay ? "lg:h-[8.5rem]" : "lg:h-[7rem]",
        )}
      >
        <button
          ref={menuButtonRef}
          type="button"
          aria-expanded={isMenuOpen}
          aria-controls={menuId}
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          onClick={() => setIsMenuOpen((open) => !open)}
          className={cx(
            "flex h-10 items-center gap-3 text-[0.8125rem] font-normal tracking-[0.18em] uppercase sm:h-6",
            focusRing,
          )}
        >
          {isMenuOpen ? (
            <X aria-hidden="true" className="-ml-0.5 size-5" strokeWidth={1.5} />
          ) : (
            <span aria-hidden="true" className="flex w-5 flex-col gap-[0.4375rem]">
              <span className="h-px w-full bg-current" />
              <span className="h-px w-full bg-current" />
            </span>
          )}
          <span aria-hidden="true">{isMenuOpen ? "Close" : "Menu"}</span>
        </button>

        <Link
          href={userRoutes.home}
          onClick={closeMenu}
          className={cx(
            "absolute top-4 left-1/2 flex -translate-x-1/2 flex-col items-center sm:top-7",
            focusRing,
          )}
        >
          <Image
            src={isOverlay ? LOGO_MARK_LIGHT_SRC : LOGO_MARK_DARK_SRC}
            alt=""
            width={81}
            height={39}
            priority
            className="h-auto w-12 sm:w-16 lg:w-[4.875rem]"
          />
          <span className="mt-2 text-center text-[0.625rem] leading-[1.15] font-semibold tracking-[0.1em] uppercase sm:mt-3 sm:text-xs lg:mt-4 lg:text-sm">
            {BRAND_NAME.split(" ").map((word) => (
              <span key={word} className="block">
                {word}
              </span>
            ))}
          </span>
        </Link>

        <Link
          href={bookingNav.href}
          onClick={closeMenu}
          className={cx(
            "inline-flex h-10 items-center gap-6 px-2.5 text-[0.625rem] font-normal tracking-[0.1em] uppercase transition-colors duration-300 min-[380px]:px-3.5 min-[380px]:tracking-[0.16em] sm:h-[3.3125rem] sm:px-[1.875rem] sm:text-[0.6875rem] sm:tracking-[0.2em]",
            isOverlay
              ? "bg-surface text-brand-950 hover:bg-pearl active:bg-pearl/90"
              : "bg-brand-950 text-white hover:bg-[#0d2c47]",
            focusRing,
          )}
        >
          {bookingNav.label}
          <ArrowRight aria-hidden="true" strokeWidth={1.5} className="hidden size-3.5 sm:block" />
        </Link>
      </div>

      <nav
        id={menuId}
        aria-label="Main"
        hidden={!isMenuOpen}
        // Compact dropdown just below the Menu button, aligned with its left edge.
        className="bg-brand-950 absolute top-[4.25rem] text-white left-4 w-[min(17rem,calc(100vw-2rem))] px-6 py-3 shadow-2xl sm:top-[3.75rem] sm:left-7 lg:left-10"
      >
        <ul className="flex flex-col divide-y divide-white/10">
          {primaryNav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={closeMenu}
                aria-current={isCurrent(item.href) ? "page" : undefined}
                className={cx(
                  "font-serif block py-3 text-[1.625rem] leading-tight opacity-90 transition-opacity duration-300 hover:opacity-100 aria-[current=page]:italic",
                  focusRingBase,
                  "focus-visible:outline-white",
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
