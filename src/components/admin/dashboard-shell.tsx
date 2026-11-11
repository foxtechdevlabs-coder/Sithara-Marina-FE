"use client";

import { Menu, SquareArrowOutUpRight, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { adminNav } from "@/config/admin-navigation";
import { adminRoutes, userRoutes } from "@/constants/routes";
import { useBreadcrumbYacht } from "@/features/admin/fleet/hooks/use-breadcrumb-yacht";

import { AdminFonts, CANVAS, INK, MUTED, NAVY, SANS } from "./admin-theme";
import { BackButton, useBackNavigation } from "./back-button";
import { SidebarNav } from "./sidebar-nav";

/** Small label at the top of each page, e.g. "Operations / Bookings". */
function pageLabel(pathname: string, yacht: { id: string; name: string } | null): string {
  // Screen codes from the Figma designs.
  if (pathname === adminRoutes.dashboard) return "Operations / A02";
  if (pathname === adminRoutes.fleet) return "Operations / A03";
  if (pathname === adminRoutes.bookings) return "Operations / A08";
  if (pathname === adminRoutes.bookingNew) return "Operations / A09";
  if (pathname.startsWith(adminRoutes.cancellationRequests))
    return "Operations / Bookings / Cancellation requests";
  const bookingMatch = pathname.match(
    /^\/admin\/bookings\/[^/]+(\/payment|\/reschedule|\/cancel)?$/,
  );
  if (bookingMatch) {
    const sub = bookingMatch[1];
    return `Operations / ${sub === "/payment" ? "A10" : sub === "/reschedule" ? "A12" : sub === "/cancel" ? "A13" : "A11"}`;
  }
  if (pathname === adminRoutes.blockBatchNew) return "Operations / Availability / Bulk block";
  if (/^\/admin\/availability\/blocked\/[^/]+$/.test(pathname)) return "Operations / A07";
  if (pathname === "/admin/commissions/new") return "Partners & finance / A16";
  if (pathname === "/admin/payouts/statement") return "Partners & finance / A18";
  if (pathname === adminRoutes.refunds) return "Partners & finance / A19";
  if (pathname === adminRoutes.reports) return "Workspace / A23";
  if (pathname === adminRoutes.audit) return "Workspace / A42";
  if (pathname === "/admin/reports/export") return "Workspace / A37";
  if (/^\/admin\/refunds\/payments\/[^/]+\/refund$/.test(pathname))
    return "Partners & finance / A20";
  if (pathname === adminRoutes.customers) return "Operations / A21";
  if (pathname === adminRoutes.customerNew) return "Operations / Customers / New";
  if (/^\/admin\/customers\/[^/]+$/.test(pathname)) return "Operations / A22";
  if (pathname === adminRoutes.fleetNew) return "Operations / Yachts / New";
  const yachtMatch = pathname.match(/^\/admin\/fleet\/([^/]+)(\/edit|\/pricing)?$/);
  if (yachtMatch && yachtMatch[1] !== "new") {
    const id = decodeURIComponent(yachtMatch[1]!);
    const name = yacht?.id === id ? yacht.name : "Yacht";
    const sub = yachtMatch[2] === "/edit" ? " / Edit" : yachtMatch[2] ? " / Slots & pricing" : "";
    return `Operations / Yachts / ${name}${sub}`;
  }
  if (pathname.startsWith(adminRoutes.staff)) return "Workspace / Settings & staff";
  for (const section of adminNav)
    for (const item of section.items)
      if (pathname === item.href || pathname.startsWith(`${item.href}/`))
        return `${section.title} / ${item.label}`;
  return "Admin";
}

function Logo({ className }: { className: string }) {
  return (
    <Image
      src="/images/brand/sithara-marina-logo.svg"
      alt="Sithara Marina"
      width={161}
      height={87}
      unoptimized
      className={`h-auto brightness-0 invert ${className}`}
    />
  );
}

/**
 * Admin dashboard frame from the Figma design: navy sidebar on desktop, a
 * navy top bar with a "Menu" drawer on smaller screens, and the content area.
 */
export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const yacht = useBreadcrumbYacht();
  const goBack = useBackNavigation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the drawer on Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <div
      className="flex min-h-dvh flex-col antialiased lg:flex-row"
      style={{ ...SANS, color: INK, backgroundColor: CANVAS }}
    >
      <AdminFonts />

      {/* Desktop sidebar */}
      <aside
        className="hidden w-[216px] shrink-0 px-[20px] pt-[18px] pb-[40px] text-white lg:sticky lg:top-0 lg:block lg:h-dvh lg:overflow-y-auto"
        style={{ backgroundColor: NAVY }}
      >
        <Link
          href={adminRoutes.dashboard}
          className="mx-auto block w-fit focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          <Logo className="w-[116px]" />
        </Link>
        <div className="mt-[8px] mb-[12px] border-t border-white/40" />
        <SidebarNav />
      </aside>

      {/* Mobile / tablet top bar */}
      <header
        className="sticky top-0 z-30 flex h-[96px] items-center justify-between px-[44px] text-white lg:hidden"
        style={{ backgroundColor: NAVY }}
      >
        <Link href={adminRoutes.dashboard} className="block">
          <Logo className="w-[74px]" />
        </Link>
        <button
          type="button"
          aria-expanded={menuOpen}
          aria-controls="admin-menu"
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-[10px] text-[14px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          {menuOpen ? (
            <X aria-hidden="true" strokeWidth={1.5} className="size-[18px]" />
          ) : (
            <Menu aria-hidden="true" strokeWidth={1.5} className="size-[18px]" />
          )}
          {menuOpen ? "Close" : "Menu"}
        </button>
      </header>
      {menuOpen && (
        <div
          id="admin-menu"
          className="fixed inset-x-0 top-[96px] bottom-0 z-30 overflow-y-auto px-[20px] pt-[16px] pb-[40px] text-white lg:hidden"
          style={{ backgroundColor: NAVY }}
        >
          <SidebarNav onNavigate={() => setMenuOpen(false)} />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="hidden items-center justify-between pt-[37px] pr-[238px] pl-[46px] lg:flex">
          <div className="flex items-center gap-[20px]">
            <BackButton onBack={goBack} />
            <p className="text-[10px] tracking-[0.12em] uppercase" style={{ color: MUTED }}>
              {pageLabel(pathname, yacht)}
            </p>
          </div>
          <div className="flex items-center gap-[14px]">
            {/^\/admin\/fleet\/(?!new$)[^/]+$/.test(pathname) && (
              <Link
                href={adminRoutes.fleetNew}
                className="flex h-[47px] w-[120px] items-center justify-center gap-[4px] border bg-white text-[12px] transition-colors hover:bg-[#f2f1ee]"
                style={{ borderColor: INK }}
              >
                + Add yacht
              </Link>
            )}
            <Link
              href={userRoutes.home}
              target="_blank"
              className="flex h-[47px] w-[147px] items-center justify-center gap-[4px] border bg-white text-[11px] transition-colors hover:bg-[#f2f1ee]"
              style={{ borderColor: INK }}
            >
              Website
              <SquareArrowOutUpRight
                aria-label="(opens in a new tab)"
                strokeWidth={1.75}
                className="size-[11px] text-[#2f6fb5]"
              />
            </Link>
          </div>
        </div>
        <BackButton onBack={goBack} className="mt-[12px] ml-[20px] w-fit lg:hidden" />
        <main id="main" className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
