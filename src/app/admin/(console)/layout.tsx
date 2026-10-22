import type { ReactNode } from "react";

import { DashboardShell } from "@/components/admin/dashboard-shell";

/**
 * Every authenticated admin route lives in this group. This layout is the
 * intended place for the future staff-session check once auth is defined.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
