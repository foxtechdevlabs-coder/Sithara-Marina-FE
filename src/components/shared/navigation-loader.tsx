"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { onNavigationStart } from "@/lib/navigation-start";
import { cx } from "@/lib/cx";

import { LoadingLogo } from "./loading-logo";
import styles from "./navigation-loader.module.css";

/** Long enough for the logo to finish drawing, even when the page is ready at once. */
const MIN_VISIBLE_MS = 1000;
const FADE_OUT_MS = 200;
/** Gives up if the path never changes, e.g. the navigation failed. */
const GIVE_UP_MS = 10_000;

interface Navigation {
  from: string;
  startedAt: number;
}

/**
 * The logo over the page on every move to another page. Query-only changes,
 * such as list filters, don't count. It lets clicks through, so it can never
 * trap anyone. `LogoLoader` covers the first load; this covers the ones after.
 */
export function NavigationLoader() {
  const pathname = usePathname();
  const [navigation, setNavigation] = useState<Navigation | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(
    () =>
      onNavigationStart((target) => {
        if (target === pathname) return;
        setNavigation({ from: pathname, startedAt: Date.now() });
        setIsLeaving(false);
      }),
    [pathname],
  );

  useEffect(() => {
    if (!navigation) return;

    const arrived = pathname !== navigation.from;
    const wait = arrived ? navigation.startedAt + MIN_VISIBLE_MS - Date.now() : GIVE_UP_MS;
    let fadeTimer: ReturnType<typeof setTimeout>;
    const timer = setTimeout(() => {
      setIsLeaving(true);
      fadeTimer = setTimeout(() => setNavigation(null), FADE_OUT_MS);
    }, wait);

    return () => {
      clearTimeout(timer);
      clearTimeout(fadeTimer);
    };
  }, [navigation, pathname]);

  if (!navigation) return null;

  return (
    <div className={cx(styles.overlay, isLeaving && styles.isLeaving)}>
      <LoadingLogo size="page" speed="quick" />
    </div>
  );
}
