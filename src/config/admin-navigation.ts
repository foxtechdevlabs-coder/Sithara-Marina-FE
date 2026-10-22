import {
  Bell,
  CalendarDays,
  ChartColumn,
  ClipboardList,
  FileText,
  Handshake,
  LayoutDashboard,
  type LucideIcon,
  Percent,
  Settings,
  Ship,
  Undo2,
  UserCog,
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
 * Sidebar navigation. Role-based visibility will be added here once the
 * staff roles and permissions contract is defined by the backend.
 */
export const adminNav: readonly AdminNavSection[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", href: adminRoutes.dashboard, icon: LayoutDashboard }],
  },
  {
    title: "Operations",
    items: [
      { label: "Fleet", href: adminRoutes.fleet, icon: Ship },
      { label: "Availability", href: adminRoutes.availability, icon: CalendarDays },
      { label: "Bookings", href: adminRoutes.bookings, icon: ClipboardList },
      { label: "Customers", href: adminRoutes.customers, icon: Users },
      { label: "Partners", href: adminRoutes.partners, icon: Handshake },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Commissions", href: adminRoutes.commissions, icon: Percent },
      { label: "Payouts", href: adminRoutes.payouts, icon: Wallet },
      { label: "Refunds", href: adminRoutes.refunds, icon: Undo2 },
      { label: "Reports", href: adminRoutes.reports, icon: ChartColumn },
    ],
  },
  {
    title: "Administration",
    items: [
      { label: "Content", href: adminRoutes.content, icon: FileText },
      { label: "Notifications", href: adminRoutes.notifications, icon: Bell },
      { label: "Staff", href: adminRoutes.staff, icon: UserCog },
      { label: "Settings", href: adminRoutes.settings, icon: Settings },
    ],
  },
];
