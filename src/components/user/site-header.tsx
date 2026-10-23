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

const LOGO_MARK_SRC = "/images/brand/sithara-marina-mark.png";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white";

/**
 * Site-wide header: menu toggle on the left, logo centred, booking button on
 * the right. On the home page it floats transparently over the hero video;
 * elsewhere it is a solid navy bar (the logo artwork is white).
 */
export function SiteHeader() {
  const pathname = usePathname();
  const isOverlay = pathname === userRoutes.home;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuId = useId();
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

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
        "font-brand z-30 w-full text-white",
        isOverlay ? "absolute inset-x-0 top-0" : "bg-brand-950 relative",
      )}
    >
      <div className="relative flex h-24 items-start justify-between px-4 pt-5 sm:h-[7.5rem] sm:px-7 sm:pt-7 lg:h-[8.5rem] lg:pl-10">
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
            src={LOGO_MARK_SRC}
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
            "bg-surface text-brand-950 inline-flex h-10 items-center gap-6 px-3.5 text-[0.625rem] font-normal tracking-[0.16em] uppercase transition-colors duration-300 hover:bg-pearl active:bg-pearl/90 sm:h-[3.3125rem] sm:px-[1.875rem] sm:text-[0.6875rem] sm:tracking-[0.2em]",
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
        className="bg-brand-950 absolute top-0 left-0 -z-10 w-full px-4 pt-28 pb-10 shadow-2xl sm:w-[26rem] sm:px-7 sm:pt-36 lg:pt-40 lg:pl-10"
      >
        <ul className="flex flex-col">
          {primaryNav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={closeMenu}
                aria-current={isCurrent(item.href) ? "page" : undefined}
                className={cx(
                  "font-serif block py-2 text-[2.25rem] leading-tight opacity-90 transition-opacity duration-300 hover:opacity-100 aria-[current=page]:italic",
                  focusRing,
                )}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-8 border-t border-white/15 pt-6">
          <Link
            href={userRoutes.account}
            onClick={closeMenu}
            aria-current={isCurrent(userRoutes.account) ? "page" : undefined}
            className={cx(
              "text-xs font-medium tracking-[0.18em] uppercase opacity-75 transition-opacity duration-300 hover:opacity-100",
              focusRing,
            )}
          >
            Account
          </Link>
        </div>
      </nav>
    </header>
  );
}
