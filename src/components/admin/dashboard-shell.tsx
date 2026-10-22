import { BRAND_NAME } from "@/constants/brand";
import { Anchor } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { adminRoutes } from "@/constants/routes";

import { SidebarNav } from "./sidebar-nav";

/** Admin dashboard frame: fixed sidebar, top bar and scrollable content area. */
export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="bg-canvas flex min-h-dvh flex-col md:flex-row">
      <aside className="bg-sidebar w-full shrink-0 p-4 md:sticky md:top-0 md:h-dvh md:w-64 md:overflow-y-auto">
        <Link
          href={adminRoutes.dashboard}
          className="mb-6 flex items-center gap-2 px-3 font-semibold text-white"
        >
          <Anchor aria-hidden="true" className="size-5" />
          {BRAND_NAME} Admin
        </Link>
        <SidebarNav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-line bg-panel flex h-14 items-center justify-end border-b px-6">
          {/* Signed-in staff member and sign-out will go here once auth is defined. */}
          <span className="text-muted text-sm">Staff session — not yet implemented</span>
        </header>
        <main id="main" className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
