"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { adminNav } from "@/config/admin-navigation";
import { adminRoutes } from "@/constants/routes";
import {
  roleLabel,
  useAdminSession,
} from "@/features/admin/auth/components/admin-session-provider";
import { cx } from "@/lib/cx";

import { INK, SAND } from "./admin-theme";

function isActive(pathname: string, href: string): boolean {
  if (href === adminRoutes.dashboard) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Sidebar links, signed-in staff member and sign out. */
export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { admin, signOut } = useAdminSession();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    onNavigate?.();
    // POST /admin/auth/logout; the local session is cleared even if it fails.
    await signOut().catch(() => {});
    router.replace(adminRoutes.login);
  }

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
        <p>{admin?.fullName}</p>
        <p>{admin ? roleLabel(admin.role) : null}</p>
      </div>
      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        className="mt-[12px] flex h-[40px] w-full items-center gap-[13px] px-[11px] text-white transition-colors hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white"
      >
        <LogOut aria-hidden="true" strokeWidth={1.5} className="size-[16px]" />
        {signingOut ? "Signing out…" : "Sign out"}
      </button>
    </nav>
  );
}
