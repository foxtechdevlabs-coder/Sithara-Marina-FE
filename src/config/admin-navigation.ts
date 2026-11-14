import {
  CalendarCheck2,
  CalendarDays,
  ChartColumn,
  CreditCard,
  Files,
  Handshake,
  LifeBuoy,
  LayoutGrid,
  type LucideIcon,
  MessagesSquare,
  Percent,
  Settings,
  ShieldCheck,
  Ship,
  Users,
  Wallet,
} from "lucide-react";
import type { Route } from "next";

import { adminRoutes } from "@/constants/routes";

export interface AdminNavItem {
  label: string;
  href: Route;
  icon: LucideIcon;
}

export interface AdminNavSection {
  title: string;
  items: readonly AdminNavItem[];
}

/**
 * Sidebar navigation, as in the admin Figma design. Role-based visibility will
 * be added here once the staff roles and permissions contract is defined.
 */
export const adminNav: readonly AdminNavSection[] = [
  {
    title: "Start",
    items: [{ label: "Overview", href: adminRoutes.dashboard, icon: LayoutGrid }],
  },
  {
    title: "Operations",
    items: [
      { label: "Bookings", href: adminRoutes.bookings, icon: CalendarCheck2 },
      { label: "Enquiries", href: adminRoutes.enquiries, icon: MessagesSquare },
      { label: "Yachts", href: adminRoutes.fleet, icon: Ship },
      { label: "Availability", href: adminRoutes.availability, icon: CalendarDays },
      { label: "Customers", href: adminRoutes.customers, icon: Users },
      { label: "Support", href: adminRoutes.support, icon: LifeBuoy },
    ],
  },
  {
    title: "Partners & finance",
    items: [
      { label: "Partners", href: adminRoutes.partners, icon: Handshake },
      { label: "Commissions", href: adminRoutes.commissions, icon: Percent },
      { label: "Payouts", href: adminRoutes.payouts, icon: Wallet },
      { label: "Payments & refunds", href: adminRoutes.refunds, icon: CreditCard },
    ],
  },
  {
    title: "Workspace",
    items: [
      { label: "Reports", href: adminRoutes.reports, icon: ChartColumn },
      { label: "Content", href: adminRoutes.content, icon: Files },
      { label: "Settings & staff", href: adminRoutes.settings, icon: Settings },
      { label: "Audit history", href: adminRoutes.audit, icon: ShieldCheck },
    ],
  },
];
