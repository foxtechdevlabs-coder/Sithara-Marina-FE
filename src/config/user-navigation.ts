import type { Route } from "next";

import { userRoutes } from "@/constants/routes";

export interface NavItem {
  label: string;
  href: Route;
}

// Labels follow the design reference. "Life on board" and "The journal" join
// this list once their routes exist.
export const primaryNav: readonly NavItem[] = [
  { label: "Our yachts", href: userRoutes.yachts },
  { label: "Our story", href: userRoutes.about },
  { label: "Get in touch", href: userRoutes.contact },
];

/** Booking call to action in the top-right corner of the header. */
export const bookingNav: NavItem = { label: "Book yachts", href: userRoutes.yachts };

export const footerNav: readonly NavItem[] = [
  { label: "About", href: userRoutes.about },
  { label: "Contact", href: userRoutes.contact },
  { label: "Terms & Conditions", href: userRoutes.terms },
  { label: "Privacy Policy", href: userRoutes.privacy },
  { label: "Cancellation Policy", href: userRoutes.cancellationPolicy },
];

export const accountNav: readonly NavItem[] = [
  { label: "Profile", href: userRoutes.account },
  { label: "My bookings", href: userRoutes.accountBookings },
];
