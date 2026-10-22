import type { Metadata } from "next";
import type { ReactNode } from "react";

import { BRAND_NAME } from "@/constants/brand";

export const metadata: Metadata = {
  title: {
    default: `${BRAND_NAME} Admin`,
    template: `%s | ${BRAND_NAME} Admin`,
  },
  description: "Sithara Marina administrative dashboard.",
  // Indexing precaution only — this is NOT access control. An `X-Robots-Tag`
  // header is also sent for /admin/* (next.config.ts). Authorization must be
  // enforced by the backend for every admin operation.
  robots: { index: false, follow: false },
};

/**
 * Admin area root. Renders no UI so that `/admin/login` does not get the
 * dashboard chrome: the sign-in screen lives in `(auth)`, the dashboard in
 * `(console)`.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
