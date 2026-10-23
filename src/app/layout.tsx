import "./globals.css";

import type { Metadata } from "next";
import { Instrument_Serif, Inter } from "next/font/google";
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

/** Customer-website fonts, used through the `font-brand` and `font-serif` utilities. */
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-instrument-serif",
});

/** The only root layout. Area-specific chrome lives in the `(user)` and `admin` layouts. */
export default function RootLayout({ children }: { children: ReactNode }) {
  // Fails `next build` (this layout is prerendered) when required public
  // configuration is missing or invalid, instead of shipping a broken bundle.
  getPublicEnv();

  return (
    <html lang="en" className={`${inter.variable} ${instrumentSerif.variable}`}>
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
