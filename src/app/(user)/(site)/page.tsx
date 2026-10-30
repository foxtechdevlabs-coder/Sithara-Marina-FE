import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/JsonLd";
import { siteConfig } from "@/config/site";
import { AboutSection } from "@/features/user/home/components/about-section";
import { AstraWaySection } from "@/features/user/home/components/astra-way-section";
import { BrandTextSection } from "@/features/user/home/components/brand-text-section";
import { DestinationsSection } from "@/features/user/home/components/destinations-section";
import { FaqSection } from "@/features/user/home/components/faq-section";
import { FeaturedYachtSection } from "@/features/user/home/components/featured-yacht-section";
import { GuestsSection } from "@/features/user/home/components/guests-section";
import { HeroSection } from "@/features/user/home/components/hero-section";
import { JournalSection } from "@/features/user/home/components/journal-section";
import { JourneyCtaSection } from "@/features/user/home/components/journey-cta-section";
import { KeralaLineArt } from "@/features/user/home/components/kerala-line-art";
import { generateFaqSchema } from "@/lib/seo-schema";

export const metadata: Metadata = {
  title: "Luxury Yacht & Houseboat Charters in Kerala",
  description: siteConfig.description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Luxury Yacht & Houseboat Charters in Kerala | Sithara Marina",
    description: siteConfig.description,
    url: "/",
    images: [
      {
        url: "/images/home/hero-yacht-img.png",
        width: 1200,
        height: 630,
        alt: "Sithara Marina luxury yacht cruising Kerala backwaters",
      },
    ],
  },
};

export default function HomePage() {
  const faqSchema = generateFaqSchema();

  return (
    <>
      <JsonLd data={faqSchema} id="home-faq-schema" />
      <HeroSection />
      <BrandTextSection />
      <AboutSection />
      <KeralaLineArt />
      <FeaturedYachtSection />
      <DestinationsSection />
      <AstraWaySection />
      <GuestsSection />
      <JournalSection />
      <FaqSection />
      <JourneyCtaSection />
    </>
  );
}
