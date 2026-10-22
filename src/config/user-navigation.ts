import type { Route } from "next";

import { userRoutes } from "@/constants/routes";

export interface NavItem {
  label: string;
  href: Route;
}

export const primaryNav: readonly NavItem[] = [
  { label: "Yachts", href: userRoutes.yachts },
  { label: "About", href: userRoutes.about },
  { label: "Contact", href: userRoutes.contact },
];

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
