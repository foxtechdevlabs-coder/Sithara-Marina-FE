"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { onNavigationStart } from "@/lib/navigation-start";
import { cx } from "@/lib/cx";

import { LoadingLogo } from "./loading-logo";
import styles from "./navigation-loader.module.css";

/**
 * Only a navigation still waiting after this long shows the logo: a page that is
 * ready sooner (cached data, a quick server answer) opens with no loading screen.
 */
const SHOW_AFTER_MS = 400;
/** Once shown, it stays at least this long, so it never just flickers. */
const MIN_VISIBLE_MS = 600;
const FADE_OUT_MS = 200;
/** Gives up if the path never changes, e.g. the navigation failed. */
const GIVE_UP_MS = 10_000;

interface Navigation {
  from: string;
  startedAt: number;
  /** When the logo appeared; null while the navigation is still quick. */
  shownAt: number | null;
}

/**
 * The logo over the page while a move to another page is genuinely slow.
 * Query-only changes, such as list filters, don't count. It lets clicks through,
 * so it can never trap anyone. `LogoLoader` covers the first load; this covers the
 * ones after.
 */
export function NavigationLoader() {
  const pathname = usePathname();
  const [navigation, setNavigation] = useState<Navigation | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(
    () =>
      onNavigationStart((target) => {
        if (target === pathname) return;
        setNavigation({ from: pathname, startedAt: Date.now(), shownAt: null });
        setIsLeaving(false);
      }),
    [pathname],
  );

  useEffect(() => {
    if (!navigation) return;
    const arrived = pathname !== navigation.from;
    let fadeTimer: ReturnType<typeof setTimeout> | undefined;

    // Arrived before the logo was needed: nothing to show or hide.
    if (arrived && navigation.shownAt === null) {
      const timer = setTimeout(() => setNavigation(null), 0);
      return () => clearTimeout(timer);
    }

    const timer = arrived
      ? setTimeout(
          () => {
            setIsLeaving(true);
            fadeTimer = setTimeout(() => setNavigation(null), FADE_OUT_MS);
          },
          Math.max(0, (navigation.shownAt ?? 0) + MIN_VISIBLE_MS - Date.now()),
        )
      : navigation.shownAt === null
        ? setTimeout(
            () => setNavigation((current) => current && { ...current, shownAt: Date.now() }),
            Math.max(0, navigation.startedAt + SHOW_AFTER_MS - Date.now()),
          )
        : setTimeout(() => setNavigation(null), GIVE_UP_MS);

    return () => {
      clearTimeout(timer);
      clearTimeout(fadeTimer);
    };
  }, [navigation, pathname]);

  if (!navigation || navigation.shownAt === null) return null;

  return (
    <div className={cx(styles.overlay, isLeaving && styles.isLeaving)}>
      <LoadingLogo size="page" speed="quick" />
    </div>
  );
}
