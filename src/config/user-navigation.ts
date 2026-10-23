import type { Route } from "next";

import { userRoutes } from "@/constants/routes";

export interface NavItem {
  label: string;
  href: Route;
}

// Labels follow the design reference. "Life on board", "Our story" and "The
// journal" join this list once their routes exist.
export const primaryNav: readonly NavItem[] = [
  { label: "Our yachts", href: userRoutes.yachts },
  { label: "Get in touch", href: userRoutes.planCharter },
];

/** Booking call to action in the top-right corner of the header. */
export const bookingNav: NavItem = { label: "Book yachts", href: userRoutes.yachts };
