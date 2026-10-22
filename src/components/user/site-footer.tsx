import { BRAND_NAME } from "@/constants/brand";
import Link from "next/link";

import { footerNav } from "@/config/user-navigation";

export function SiteFooter() {
  return (
    <footer className="border-line text-muted border-t text-sm">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:justify-between">
        <p>
          &copy; {new Date().getFullYear()} {BRAND_NAME}
        </p>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {footerNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-ink">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
