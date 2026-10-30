import "./globals.css";

import type { Metadata } from "next";
import { Instrument_Serif, Inter, Manrope } from "next/font/google";
import type { ReactNode } from "react";

import { JsonLd } from "@/components/seo/JsonLd";
import { getPublicEnv } from "@/config/env";
import { siteConfig, SITE_URL } from "@/config/site";
import { BRAND_NAME } from "@/constants/brand";
import { generateLocalBusinessSchema, generateWebsiteSchema } from "@/lib/seo-schema";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BRAND_NAME} — Yacht Charters`,
    template: `%s | ${BRAND_NAME}`,
  },
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  authors: [{ name: BRAND_NAME, url: SITE_URL }],
  creator: BRAND_NAME,
  publisher: BRAND_NAME,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "./",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
    siteName: BRAND_NAME,
    title: `${BRAND_NAME} — Luxury Yacht & Houseboat Charters in Kerala`,
    description: siteConfig.description,
    images: [
      {
        url: "/images/home/hero-yacht-img.png",
        width: 1200,
        height: 630,
        alt: `${BRAND_NAME} — Luxury Yacht & Houseboat Charters in Kerala`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND_NAME} — Luxury Yacht & Houseboat Charters in Kerala`,
    description: siteConfig.description,
    images: ["/images/home/hero-yacht-img.png"],
    creator: "@SitharaMarina",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
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

/** Guest attribution text (`font-attribution`). */
const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

/** The only root layout. Area-specific chrome lives in the `(user)` and `admin` layouts. */
export default function RootLayout({ children }: { children: ReactNode }) {
  // Fails `next build` (this layout is prerendered) when required public
  // configuration is missing or invalid, instead of shipping a broken bundle.
  getPublicEnv();

  const businessSchema = generateLocalBusinessSchema();
  const websiteSchema = generateWebsiteSchema();

  return (
    <html lang="en" className={`${inter.variable} ${instrumentSerif.variable} ${manrope.variable}`}>
      <head>
        <JsonLd data={businessSchema} id="organization-schema" />
        <JsonLd data={websiteSchema} id="website-schema" />
      </head>
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
