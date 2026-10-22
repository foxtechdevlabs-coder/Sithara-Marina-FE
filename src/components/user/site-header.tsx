import { BRAND_NAME } from "@/constants/brand";
import { Anchor, UserRound } from "lucide-react";
import Link from "next/link";

import { primaryNav } from "@/config/user-navigation";
import { userRoutes } from "@/constants/routes";

export function SiteHeader() {
  return (
    <header className="border-line border-b">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
        <Link
          href={userRoutes.home}
          className="text-brand-900 flex items-center gap-2 font-semibold"
        >
          <Anchor aria-hidden="true" className="size-5" />
          {BRAND_NAME}
        </Link>

        <nav aria-label="Main">
          <ul className="flex items-center gap-6 text-sm">
            {primaryNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-brand-600">
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href={userRoutes.account}
                className="hover:text-brand-600 flex items-center gap-1"
              >
                <UserRound aria-hidden="true" className="size-4" />
                Account
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
