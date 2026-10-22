import { BRAND_NAME } from "@/constants/brand";
import { Anchor } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { userRoutes } from "@/constants/routes";

/**
 * Focused, distraction-free shell for the checkout flow (no main navigation),
 * so customers stay on task while a backend slot hold is active.
 */
export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="border-line border-b">
        <div className="mx-auto flex max-w-3xl items-center px-4 py-4">
          <Link
            href={userRoutes.home}
            className="text-brand-900 flex items-center gap-2 font-semibold"
          >
            <Anchor aria-hidden="true" className="size-5" />
            {BRAND_NAME}
          </Link>
        </div>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
    </>
  );
}
