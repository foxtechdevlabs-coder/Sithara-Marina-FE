"use client";

import { cx } from "@/lib/cx";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { adminNav } from "@/config/admin-navigation";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Client Component only because it highlights the current route. */
export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin" className="flex flex-col gap-6 text-sm">
      {adminNav.map((section) => (
        <div key={section.title}>
          <p className="text-sidebar-muted px-3 text-xs font-semibold tracking-wider uppercase">
            {section.title}
          </p>
          <ul className="mt-2 flex flex-col gap-0.5">
            {section.items.map(({ label, href, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cx(
                      "flex items-center gap-3 rounded-md px-3 py-2",
                      active ? "bg-white/10 text-white" : "text-sidebar-muted hover:text-white",
                    )}
                  >
                    <Icon aria-hidden="true" className="size-4" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
