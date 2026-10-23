import { AboutSection } from "@/features/user/home/components/about-section";
import { BrandTextSection } from "@/features/user/home/components/brand-text-section";
import { DestinationsSection } from "@/features/user/home/components/destinations-section";
import { FeaturedYachtSection } from "@/features/user/home/components/featured-yacht-section";
import { HeroSection } from "@/features/user/home/components/hero-section";
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
    </>
  );
}
