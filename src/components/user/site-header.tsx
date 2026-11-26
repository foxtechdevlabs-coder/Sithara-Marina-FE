"use client";

import { BRAND_NAME } from "@/constants/brand";

import { ArrowRight, LogOut, UserRound, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";

import { accountMenuNav, accountNav, bookingNav, primaryNav } from "@/config/user-navigation";
import { userRoutes } from "@/constants/routes";
import { signOut, useAuthSession } from "@/features/user/auth/session";
import { NotificationBell } from "@/features/user/notifications/components/notification-bell";
import { useNotificationInbox } from "@/features/user/notifications/hooks/use-notification-inbox";
import { cx } from "@/lib/cx";

/** White artwork for the home hero; navy artwork for the light header on every other page. */
const LOGO_MARK_LIGHT_SRC = "/images/brand/sithara-marina-mark.png";
const LOGO_MARK_DARK_SRC = "/images/brand/sithara-marina-mark.svg";

const focusRingBase = "focus-visible:outline-2 focus-visible:outline-offset-4";

/** Past this scroll offset the home header leaves the hero and turns into the white bar. */
const SCROLLED_PX = 24;
const subscribeToScroll = (onChange: () => void) => {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
};
const isScrolled = () => window.scrollY > SCROLLED_PX;

/**
 * "asha menon" or "ASHA MENON" → "Asha Menon". Mixed capitals already typed (e.g.
 * "McKenzie") are kept.
 */
const titleCase = (name: string) =>
  (name === name.toUpperCase() ? name.toLowerCase() : name).replace(
    /(^|[\s'-])(\p{Ll})/gu,
    (_, before: string, letter: string) => before + letter.toUpperCase(),
  );

/** Every item in the menu dropdown: the main links, the account links, the name and Logout. */
const menuItemClass =
  "font-serif block py-3 text-[1.625rem] leading-tight opacity-90 transition-opacity duration-300 hover:opacity-100 aria-[current=page]:italic";

const accountMenuItemClass =
  "flex items-center gap-3 py-3 font-serif text-[1.625rem] leading-tight opacity-90 transition-opacity duration-300 hover:opacity-100 aria-[current=page]:italic";

/**
 * Site-wide header, fixed to the top of the viewport: menu toggle on the left,
 * logo centred, booking button on the right. My account / Sign in and Logout
 * live in the menu. On the home page it floats transparently over the hero
 * video with white text and logo until the page scrolls, then becomes the
 * white bar with dark text used on every other page, as in the Figma designs.
 * Other pages get a spacer of the header's height (`--site-header-h`) so their
 * content starts below it.
 */
export function SiteHeader() {
  const session = useAuthSession();
  const fullName = session?.user?.fullName?.trim();
  const userName = fullName ? titleCase(fullName) : undefined;
  const pathname = usePathname();
  const isHome = pathname === userRoutes.home;
  const scrolled = useSyncExternalStore(subscribeToScroll, isScrolled, () => false);
  const isOverlay = isHome && !scrolled;
  // One inbox for both bell placements; emptied on sign-out.
  const notifications = useNotificationInbox(Boolean(session));
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [logoutFailed, setLogoutFailed] = useState(false);
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
  const logOut = () => {
    closeMenu();
    setLogoutFailed(false);
    void signOut().then((confirmed) => setLogoutFailed(!confirmed));
  };
  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      {/* Keeps the page content clear of the fixed header (the home hero runs underneath it). */}
      {isHome ? null : <div aria-hidden="true" className="h-[var(--site-header-h)] shrink-0" />}
      <header
        id="site-header"
        ref={headerRef}
        className={cx(
          "font-brand fixed inset-x-0 top-0 z-30 w-full transition-[background-color,color,box-shadow] duration-300",
          isOverlay ? "bg-transparent text-white" : "bg-white text-[#0d1b2a]",
          scrolled && "shadow-[0_1px_0_#d9dcdf]",
        )}
      >
        <div
          className={cx(
            // One balanced height everywhere (72 / 80 / 96px, as `--site-header-h`), with Menu,
            // logo and "Book yachts" all centred in it.
            "relative flex h-[4.5rem] items-center justify-between px-4 sm:h-20 sm:px-7 lg:h-24 lg:pl-10",
          )}
        >
          <div className="flex items-center">
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
            {/* Phones only: beside "Book yachts" the bell would run into the logo. */}
            {session ? (
              <div className="ml-1 sm:hidden">
                <NotificationBell
                  inbox={notifications}
                  onOpen={closeMenu}
                  focusRingClass={focusRing}
                />
              </div>
            ) : null}
          </div>

          <Link
            href={userRoutes.home}
            onClick={closeMenu}
            className={cx(
              "absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center",
              focusRing,
            )}
          >
            <Image
              src={isOverlay ? LOGO_MARK_LIGHT_SRC : LOGO_MARK_DARK_SRC}
              alt=""
              width={81}
              height={39}
              priority
              className="h-auto w-10 sm:w-11 lg:w-14"
            />
            <span className="mt-1.5 text-center text-[0.625rem] leading-[1.1] font-semibold tracking-[0.1em] uppercase sm:text-[0.6875rem] lg:mt-2 lg:text-xs">
              {BRAND_NAME.split(" ").map((word) => (
                <span key={word} className="block">
                  {word}
                </span>
              ))}
            </span>
          </Link>

          <div className="flex items-center gap-1.5 md:gap-2.5 lg:gap-[1.125rem]">
            {/* From xl only: narrower headers would run into the logo; the menu shows it there. */}
            {session && userName ? (
              <span
                title={userName}
                className="hidden max-w-36 self-center truncate text-[0.875rem] xl:block"
              >
                {userName}
              </span>
            ) : null}
            {session ? (
              <div className="hidden sm:block">
                <NotificationBell
                  inbox={notifications}
                  onOpen={closeMenu}
                  focusRingClass={focusRing}
                />
              </div>
            ) : null}

            <Link
              href={bookingNav.href}
              onClick={closeMenu}
              className={cx(
                "inline-flex h-10 items-center gap-6 px-2.5 text-[0.625rem] font-normal tracking-[0.1em] uppercase transition-colors duration-300 min-[380px]:px-3.5 min-[380px]:tracking-[0.16em] sm:h-12 sm:px-7 sm:text-[0.6875rem] sm:tracking-[0.2em] lg:h-[3.25rem] lg:px-8",
                isOverlay
                  ? "bg-surface text-brand-950 hover:bg-pearl active:bg-pearl/90"
                  : "bg-brand-950 text-white hover:bg-[#0d2c47]",
                focusRing,
              )}
            >
              {bookingNav.label}
              <ArrowRight
                aria-hidden="true"
                strokeWidth={1.5}
                className="hidden size-3.5 sm:block"
              />
            </Link>
          </div>
        </div>

        {/* Not shown once signed in again: it is about the session that was ended. */}
        {logoutFailed && !session ? (
          <div
            role="alert"
            className="absolute top-full right-4 z-30 flex max-w-[min(24rem,calc(100vw-2rem))] items-start gap-3 border border-[#0d1b2a] bg-white px-4 py-3 text-[0.8125rem] leading-snug text-[#0d1b2a] sm:right-7"
          >
            <p>
              You’re signed out on this device, but we couldn’t confirm your session was revoked on
              the server.
            </p>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setLogoutFailed(false)}
              className="focus-visible:outline-brand-950 shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <X aria-hidden="true" className="size-4" strokeWidth={1.5} />
            </button>
          </div>
        ) : null}

        <nav
          id={menuId}
          aria-label="Main"
          hidden={!isMenuOpen}
          // Compact dropdown just below the header, aligned with the Menu button's left edge. The
          // header is fixed, so on short screens the menu scrolls itself rather than with the page.
          className="bg-brand-950 motion-safe:animate-menu-in absolute top-full left-4 max-h-[calc(100dvh-var(--site-header-h)-1rem)] w-[min(17rem,calc(100vw-2rem))] overflow-y-auto overscroll-contain px-6 py-3 text-white shadow-2xl sm:left-7 lg:left-10"
        >
          <ul className="flex flex-col divide-y divide-white/10">
            {primaryNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={closeMenu}
                  aria-current={isCurrent(item.href) ? "page" : undefined}
                  className={cx(menuItemClass, focusRingBase, "focus-visible:outline-white")}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            {session
              ? accountMenuNav.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={closeMenu}
                      aria-current={isCurrent(item.href) ? "page" : undefined}
                      className={cx(menuItemClass, focusRingBase, "focus-visible:outline-white")}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))
              : null}
            {session && userName ? (
              <li title={userName} className={cx(menuItemClass, "truncate hover:opacity-90")}>
                <span className="sr-only">Signed in as </span>
                {userName}
              </li>
            ) : null}
            {/* Signed in: My account and Logout. Signed out: Sign in. */}
            {session ? (
              <li>
                <Link
                  href={accountNav.href}
                  onClick={closeMenu}
                  aria-current={isCurrent(accountNav.href) ? "page" : undefined}
                  className={cx(accountMenuItemClass, focusRingBase, "focus-visible:outline-white")}
                >
                  <UserRound aria-hidden="true" strokeWidth={1.25} className="size-5" />
                  {accountNav.label}
                </Link>
              </li>
            ) : null}
            <li>
              {session ? (
                <button
                  type="button"
                  onClick={logOut}
                  className={cx(
                    accountMenuItemClass,
                    "w-full",
                    focusRingBase,
                    "focus-visible:outline-white",
                  )}
                >
                  <LogOut aria-hidden="true" strokeWidth={1.25} className="size-5" />
                  Logout
                </button>
              ) : (
                <Link
                  href={userRoutes.login}
                  onClick={closeMenu}
                  aria-current={isCurrent(userRoutes.login) ? "page" : undefined}
                  className={cx(accountMenuItemClass, focusRingBase, "focus-visible:outline-white")}
                >
                  <UserRound aria-hidden="true" strokeWidth={1.25} className="size-5" />
                  Sign in
                </Link>
              )}
            </li>
          </ul>
        </nav>
      </header>
    </>
  );
}
