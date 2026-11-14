import Link from "next/link";
import type { Route } from "next";

import {
  darkButtonClass,
  primaryButtonClass,
  primaryButtonStyle,
  secondaryButtonClass,
} from "@/features/user/account/components/account-ui";
import { userRoutes } from "@/constants/routes";
import { cx } from "@/lib/cx";

export type BookingsTab = "upcoming" | "past" | "enquiries";

const TABS: Record<BookingsTab, { label: string; href: Route }> = {
  upcoming: { label: "Upcoming", href: userRoutes.accountBookings },
  past: { label: "Past journeys", href: userRoutes.accountPastBookings },
  enquiries: { label: "Enquiries", href: userRoutes.accountEnquiries },
};

export interface BookingsTabsProps {
  current: BookingsTab;
  /** Which tabs, in order: the Figma history views show only Past and Upcoming. */
  tabs?: readonly BookingsTab[];
  /** Renames a tab, e.g. "Past & cancelled" once a booking was cancelled. */
  labels?: Partial<Record<BookingsTab, string>>;
  /** The current tab: light-to-blue gradient, or solid navy (Figma C50). */
  activeTone?: "gradient" | "dark";
}

/** Upcoming / Past journeys / Enquiries: links, so each view has its own URL. */
export function BookingsTabs({
  current,
  tabs = ["upcoming", "past", "enquiries"],
  labels,
  activeTone = "gradient",
}: BookingsTabsProps) {
  return (
    <nav aria-label="Bookings" className="-mx-4 mt-8 overflow-x-auto px-4 sm:mx-0 sm:px-0 lg:mt-10">
      <ul className="flex gap-3 sm:gap-4">
        {tabs.map((tabId) => {
          const tab = TABS[tabId];
          const isCurrent = tabId === current;
          const activeClass = activeTone === "dark" ? darkButtonClass : primaryButtonClass;
          return (
            <li key={tabId} className="shrink-0">
              <Link
                href={tab.href}
                aria-current={isCurrent ? "page" : undefined}
                className={cx(
                  isCurrent ? activeClass : secondaryButtonClass,
                  "min-h-[46px] min-w-[8.75rem] text-[12px]",
                )}
                style={isCurrent && activeTone === "gradient" ? primaryButtonStyle : undefined}
              >
                {labels?.[tabId] ?? tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
