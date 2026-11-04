"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { adminNav } from "@/config/admin-navigation";
import { adminRoutes } from "@/constants/routes";
import { cx } from "@/lib/cx";

import { INK, SAND } from "./admin-theme";

function isActive(pathname: string, href: string): boolean {
  if (href === adminRoutes.dashboard) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

// DUMMY signed-in staff member until the staff session API exists.
export const STAFF = { name: "Anjali Krishnan", role: "Super administrator", initials: "AK" };

/** Sidebar links, signed-in staff member and sign out. */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin" className="text-[13px] [&>div:first-child>p]:mt-0">
      {adminNav.map((section) => (
        <div key={section.title}>
          <p className="mt-[24px] text-[10px] leading-[14px] tracking-[0.12em] text-white/80 uppercase">
            {section.title}
          </p>
          <ul className="mt-[10px] flex flex-col gap-[8px]">
            {section.items.map(({ label, href, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cx(
                      "flex h-[40px] items-center gap-[13px] px-[11px] transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white",
                      active ? "" : "text-white hover:bg-white/[0.06]",
                    )}
                    style={active ? { backgroundColor: SAND, color: INK } : undefined}
                  >
                    <Icon aria-hidden="true" strokeWidth={1.5} className="size-[16px] shrink-0" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}

      <div className="mt-[24px] border-t border-white/40 pt-[16px] text-[10.5px] leading-[15px] text-white">
        <p>{STAFF.name}</p>
        <p>{STAFF.role}</p>
      </div>
      <Link
        href={adminRoutes.login}
        onClick={onNavigate}
        className="mt-[12px] flex h-[40px] items-center gap-[13px] px-[11px] text-white transition-colors hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white"
      >
        <LogOut aria-hidden="true" strokeWidth={1.5} className="size-[16px]" />
        Sign out
      </Link>
    </nav>
  );
}
