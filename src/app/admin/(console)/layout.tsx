import type { ReactNode } from "react";

import { DashboardShell } from "@/components/admin/dashboard-shell";
import { RequireAdmin } from "@/features/admin/auth/components/require-admin";

/**
 * Every authenticated admin route lives in this group. `RequireAdmin` shows it
 * only to a signed-in admin or super admin (session restored with
 * GET /admin/auth/me); the backend enforces access on every endpoint.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAdmin>
      <DashboardShell>{children}</DashboardShell>
    </RequireAdmin>
  );
}
