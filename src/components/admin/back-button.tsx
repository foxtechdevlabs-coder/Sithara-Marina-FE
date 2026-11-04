"use client";

import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { adminRoutes } from "@/constants/routes";

/** The page above this one: /admin/fleet/x/edit → /admin/fleet/x; a top page → the dashboard. */
function parentOf(pathname: string): Route {
  const parent = pathname.replace(/\/[^/]+\/?$/, "");
  return (parent.split("/").length > 2 ? parent : adminRoutes.dashboard) as Route;
}

/**
 * Returns to the previous admin page. Browser history alone can't be trusted
 * here: a page opened directly has the new-tab page behind it, and going back
 * would leave the admin. So it counts moves within the console, and with none
 * to undo it goes up to the parent page instead.
 */
export function useBackNavigation() {
  const router = useRouter();
  const pathname = usePathname();
  const moves = useRef(0);
  /** How the next page change affects `moves`: a normal link adds one. */
  const nextChange = useRef(1);
  const previous = useRef(pathname);

  useEffect(() => {
    if (pathname === previous.current) return;
    previous.current = pathname;
    moves.current += nextChange.current;
    nextChange.current = 1;
  }, [pathname]);

  return () => {
    if (moves.current > 0) {
      nextChange.current = -1;
      router.back();
    } else {
      // Replaces this page, so pressing Back again keeps climbing instead of returning here.
      nextChange.current = 0;
      router.replace(parentOf(pathname));
    }
  };
}

export function BackButton({ onBack, className }: { onBack: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className={`inline-flex h-[32px] items-center gap-[6px] text-[12px] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d1b2a] ${className ?? ""}`}
    >
      <ArrowLeft aria-hidden="true" strokeWidth={1.5} className="size-[14px]" />
      Back
    </button>
  );
}
