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

export default function HomePage() {
  return (
    <>
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
