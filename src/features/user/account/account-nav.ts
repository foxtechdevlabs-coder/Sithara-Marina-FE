import {
  Bell,
  CalendarCheck,
  CircleHelp,
  LayoutGrid,
  MessagesSquare,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { Route } from "next";

import { userRoutes } from "@/constants/routes";

export interface AccountNavItem {
  label: string;
  href: Route;
  icon: LucideIcon;
}

/** The account sections, in the Figma sidebar's order. */
export const accountNav: readonly AccountNavItem[] = [
  { label: "Overview", href: userRoutes.account, icon: LayoutGrid },
  { label: "My bookings", href: userRoutes.accountBookings, icon: CalendarCheck },
  { label: "My enquiries", href: userRoutes.accountEnquiries, icon: MessagesSquare },
  { label: "Profile details", href: userRoutes.accountProfile, icon: UserRound },
  { label: "Security", href: userRoutes.accountSecurity, icon: ShieldCheck },
  { label: "Notifications", href: userRoutes.accountNotifications, icon: Bell },
  { label: "Help & support", href: userRoutes.accountHelp, icon: CircleHelp },
];

/** Overview matches only `/account`; every other section also matches its sub-pages. */
export function isAccountNavActive(href: string, pathname: string): boolean {
  if (href === userRoutes.account) return pathname === href;
  // A proposal belongs to an enquiry.
  if (href === userRoutes.accountEnquiries && pathname.startsWith("/account/proposals/"))
    return true;
  return pathname === href || pathname.startsWith(`${href}/`);
}
