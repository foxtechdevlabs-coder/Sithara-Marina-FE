import { BRAND_NAME } from "@/constants/brand";
import type { ReactNode } from "react";

/** Centred shell for staff sign-in; deliberately outside the dashboard shell. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main id="main" className="bg-sidebar flex min-h-dvh flex-col items-center justify-center px-4">
      <p className="mb-6 font-semibold text-white">{BRAND_NAME} Admin</p>
      <div className="bg-panel w-full max-w-sm rounded-lg shadow-lg">{children}</div>
    </main>
  );
}
