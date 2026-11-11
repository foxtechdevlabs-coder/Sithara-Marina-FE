"use client";

import { BRAND_NAME } from "@/constants/brand";

import { ArrowRight, LogOut, UserRound, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { accountNav, bookingNav, primaryNav } from "@/config/user-navigation";
import { userRoutes } from "@/constants/routes";
import { signOut, useAuthSession } from "@/features/user/auth/session";
import { cx } from "@/lib/cx";

/** White artwork for the home hero; navy artwork for the light header on every other page. */
const LOGO_MARK_LIGHT_SRC = "/images/brand/sithara-marina-mark.png";
const LOGO_MARK_DARK_SRC = "/images/brand/sithara-marina-mark.svg";

const focusRingBase = "focus-visible:outline-2 focus-visible:outline-offset-4";

const accountButtonClass =
  "hidden h-[3.3125rem] w-11 items-center justify-center gap-2.5 border border-[#0d1b2a] bg-white text-[0.875rem] text-[#0d1b2a] transition-colors duration-300 hover:bg-[#0d1b2a] hover:text-white sm:inline-flex lg:w-[11.75rem]";
const accountMenuItemClass =
  "flex items-center gap-3 py-3 font-serif text-[1.625rem] leading-tight opacity-90 transition-opacity duration-300 hover:opacity-100 aria-[current=page]:italic";

/**
 * Site-wide header: menu toggle on the left, logo centred, booking button on
 * the right. On the home page it floats transparently over the hero video with
 * white text and logo; on every other page it is a white bar with dark text,
 * as in the Figma designs. Signed in, Logout replaces Sign in, next to the
 * user's name when the session has one (POST /auth/login returns no user).
 */
export function SiteHeader() {
  const session = useAuthSession();
  const userName = session?.user?.fullName;
  const pathname = usePathname();
  const isOverlay = pathname === userRoutes.home;
  const isAccountArea =
    pathname === userRoutes.account || pathname.startsWith(`${userRoutes.account}/`);
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

        <div className="flex gap-1.5 md:gap-2.5 lg:gap-[1.125rem]">
          {/* Sign in / Logout: full button from lg, icon-only from sm; inside the menu on phones. */}
          {session ? (
            <>
              {/* From xl only: narrower headers would run into the logo; the menu shows it there. */}
              {userName ? (
                <span
                  title={userName}
                  className="hidden max-w-36 self-center truncate text-[0.875rem] xl:block"
                >
                  {userName}
                </span>
              ) : null}
              {/* Signed in: "My account" (Figma). Logout lives in the account menu and the phone menu. */}
              <Link
                href={accountNav.href}
                onClick={closeMenu}
                aria-label={accountNav.label}
                aria-current={isAccountArea ? "page" : undefined}
                className={cx(accountButtonClass, focusRing)}
              >
                <UserRound
                  aria-hidden="true"
                  strokeWidth={1.5}
                  className="size-[1.125rem] shrink-0"
                />
                <span className="hidden lg:inline">{accountNav.label}</span>
              </Link>
            </>
          ) : (
            <Link
              href={userRoutes.login}
              onClick={closeMenu}
              aria-label="Sign in"
              aria-current={isCurrent(userRoutes.login) ? "page" : undefined}
              className={cx(accountButtonClass, focusRing)}
            >
              <UserRound
                aria-hidden="true"
                strokeWidth={1.5}
                className="size-[1.125rem] shrink-0"
              />
              <span className="hidden lg:inline">Sign in</span>
            </Link>
          )}

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
          {userName ? (
            <li title={userName} className="truncate py-3 text-[0.875rem] opacity-90 xl:hidden">
              {userName}
            </li>
          ) : null}
          {/* Phones have no room for the header's Sign in / My account button. */}
          {session ? (
            <li className="sm:hidden">
              <Link
                href={accountNav.href}
                onClick={closeMenu}
                aria-current={isAccountArea ? "page" : undefined}
                className={cx(accountMenuItemClass, focusRingBase, "focus-visible:outline-white")}
              >
                <UserRound aria-hidden="true" strokeWidth={1.25} className="size-5" />
                {accountNav.label}
              </Link>
            </li>
          ) : null}
          <li className={session ? undefined : "sm:hidden"}>
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
  );
}
