import type { Route } from "next";

import { userRoutes } from "@/constants/routes";

export interface NavItem {
  label: string;
  href: Route;
}

// Labels follow the design reference, in title case like every menu item. "Life on board", "Our story" and "The
// journal" join this list once their routes exist.
export const primaryNav: readonly NavItem[] = [
  { label: "Our Yachts", href: userRoutes.yachts },
  { label: "Find Your Yacht", href: userRoutes.search },
  { label: "Get In Touch", href: userRoutes.planCharter },
];

/** Shown in the menu once a customer is signed in. */
export const accountMenuNav: readonly NavItem[] = [
  { label: "My Enquiries", href: userRoutes.accountEnquiries },
  { label: "Cancellation Request", href: userRoutes.accountCancellations },
];

/** Booking call to action in the top-right corner of the header. */
export const bookingNav: NavItem = { label: "Book yachts", href: userRoutes.yachts };

/** Account shortcut beside the booking button: the account overview (Figma C51). */
export const accountNav: NavItem = { label: "My account", href: userRoutes.account };
