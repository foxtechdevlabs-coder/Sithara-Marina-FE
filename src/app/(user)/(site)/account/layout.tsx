import Link from "next/link";
import type { ReactNode } from "react";

import { accountNav } from "@/config/user-navigation";

/**
 * Customer account area. This layout is the intended place for the future
 * signed-in check once the authentication contract is defined.
 */
export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:flex-row">
      <nav aria-label="Account" className="md:w-48 md:shrink-0">
        <ul className="flex gap-4 text-sm md:flex-col md:gap-2">
          {accountNav.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="hover:text-brand-600">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex-1">{children}</div>
    </div>
  );
}
