import { Menu, UserRound } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { userRoutes } from "@/constants/routes";
import { cx } from "@/lib/cx";

import { AccountSidebar } from "./account-sidebar";

/** Page frame of the account area: same side padding as the rest of the site. */
export const ACCOUNT_FRAME =
  "mx-auto w-full max-w-[1728px] border-t border-rule px-4 pt-3 pb-20 sm:px-10 sm:pt-8 lg:px-[100px] lg:pt-[100px] lg:pb-[120px]";

/**
 * Account pages with the sidebar: on desktop the sidebar sits beside the page;
 * below `lg` it collapses into the pearl "My account" bar, which opens the
 * account menu page.
 */
export function AccountShell({ children }: { children: ReactNode }) {
  return (
    <div
      className={cx(
        ACCOUNT_FRAME,
        "lg:grid lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:items-start lg:gap-10 xl:gap-12",
      )}
    >
      <aside aria-label="Your account" className="hidden print:hidden lg:block">
        <AccountSidebar />
      </aside>

      <div className="min-w-0">
        <Link
          href={userRoutes.accountMenu}
          className="bg-pearl text-navy-ink focus-visible:outline-navy-ink mb-6 flex h-[50px] items-center gap-3 px-4 text-[14px] focus-visible:outline-2 focus-visible:outline-offset-2 print:hidden lg:hidden"
        >
          <UserRound aria-hidden="true" strokeWidth={1.5} className="size-[18px]" />
          My account
          <Menu aria-hidden="true" strokeWidth={1.5} className="ml-auto size-5" />
          <span className="sr-only">: all account sections</span>
        </Link>
        {children}
      </div>
    </div>
  );
}
