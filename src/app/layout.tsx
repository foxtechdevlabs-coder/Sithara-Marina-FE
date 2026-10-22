import "./globals.css";

import type { Metadata } from "next";
import type { ReactNode } from "react";

import { getPublicEnv } from "@/config/env";
import { BRAND_NAME } from "@/constants/brand";

export const metadata: Metadata = {
  title: {
    default: `${BRAND_NAME} — Yacht Charters`,
    template: `%s | ${BRAND_NAME}`,
  },
  description: "Browse and book yacht charters with Sithara Marina.",
};

/** The only root layout. Area-specific chrome lives in the `(user)` and `admin` layouts. */
export default function RootLayout({ children }: { children: ReactNode }) {
  // Fails `next build` (this layout is prerendered) when required public
  // configuration is missing or invalid, instead of shipping a broken bundle.
  getPublicEnv();

  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
