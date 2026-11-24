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
import { toShowcaseSlides, type ShowcaseSlide } from "@/features/user/home/utils/spin-showcase";
import { generateFaqSchema } from "@/lib/seo-schema";
import {
  CONTENT_REVALIDATE_SECONDS,
  getHomeContent,
  listAllFaqs,
  type Faq,
} from "@/services/user/content.service";
import { getYacht, type YachtDetail } from "@/services/user/yachts.service";

/**
 * Published content (FAQs) is read again at most every minute, so changes made in
 * the backend appear without a new deploy.
 */
export const revalidate = 60; // the same minute as the content service's cache

/** The published FAQs; none (or the backend unreachable) leaves only the introduction. */
async function loadFaqs(): Promise<Faq[]> {
  try {
    return await listAllFaqs();
  } catch {
    return [];
  }
}

/**
 * The "Featured yacht." carousel: the yachts the admin chose for the 360°
 * showcase (GET /content/home), with each one's length, suites and text (GET
 * /yachts/{slug}). None chosen, or the backend unreachable, hides the section.
 */
async function loadShowcase(): Promise<ShowcaseSlide[]> {
  try {
    const { spin_showcase: showcase } = await getHomeContent();
    const details = await Promise.all(
      showcase.map(({ slug }) =>
        getYacht(slug, undefined, { revalidate: CONTENT_REVALIDATE_SECONDS }).then(
          (yacht): [string, YachtDetail | null] => [slug, yacht],
          (): [string, YachtDetail | null] => [slug, null],
        ),
      ),
    );
    return toShowcaseSlides(showcase, Object.fromEntries(details));
  } catch {
    return [];
  }
}

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

export default async function HomePage() {
  const [faqs, showcase] = await Promise.all([loadFaqs(), loadShowcase()]);

  return (
    <>
      {faqs.length > 0 && <JsonLd data={generateFaqSchema(faqs)} id="home-faq-schema" />}
      <HeroSection />
      <BrandTextSection />
      <AboutSection />
      <KeralaLineArt />
      <FeaturedYachtSection slides={showcase} />
      <DestinationsSection />
      <AstraWaySection />
      <GuestsSection />
      <JournalSection />
      <FaqSection faqs={faqs} />
      <JourneyCtaSection />
    </>
  );
}
