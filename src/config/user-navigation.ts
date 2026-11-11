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
  { label: "Find your yacht", href: userRoutes.search },
  { label: "Get in touch", href: userRoutes.planCharter },
];

/** Shown in the menu once a customer is signed in. */
export const accountNav: readonly NavItem[] = [
  { label: "My enquiries", href: userRoutes.accountEnquiries },
  { label: "Cancellation requests", href: userRoutes.accountCancellations },
];

/** Booking call to action in the top-right corner of the header. */
export const bookingNav: NavItem = { label: "Book yachts", href: userRoutes.yachts };
