import { BRAND_NAME } from "@/constants/brand";
import Link from "next/link";
import type { ReactNode } from "react";

import { userRoutes } from "@/constants/routes";

/** Minimal centred shell for customer sign-in and registration. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main id="main" className="bg-brand-50 flex flex-1 flex-col items-center justify-center px-4">
      <Link href={userRoutes.home} className="text-brand-900 mb-6 font-semibold">
        {BRAND_NAME}
      </Link>
      <div className="border-line bg-surface w-full max-w-md rounded-lg border shadow-sm">
        {children}
      </div>
    </main>
  );
}
