"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cx } from "@/lib/cx";

import { accountNav, isAccountNavActive } from "../account-nav";

/** The account sections with their icons; the current one has a pearl background. */
export function AccountNavList({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Account" className={className}>
      <ul className="space-y-1.5">
        {accountNav.map(({ label, href, icon: Icon }) => {
          const isActive = isAccountNavActive(href, pathname);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cx(
                  "focus-visible:outline-navy-ink text-navy-ink flex min-h-11 items-center gap-3 px-2.5 text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
                  isActive ? "bg-pearl" : "hover:bg-pearl/60",
                )}
              >
                <Icon aria-hidden="true" strokeWidth={1.5} className="size-[18px] shrink-0" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
