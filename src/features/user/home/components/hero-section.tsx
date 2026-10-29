import { HeroSearch } from "./hero-search";
import { HeroVideo } from "./hero-video";

const HERO_VIDEO_SRC = "/video/hero_yacht.mp4";

/**
 * Cinematic opening of the home page: at least one viewport tall (`100vh`, or
 * `100dvh` where supported), growing only if the search bar needs more room. The header floats
 * above it; the video is absolutely positioned and never sizes the hero.
 */
export function HeroSection() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="bg-brand-950 font-brand relative isolate flex min-h-screen flex-col justify-end supports-[height:100dvh]:min-h-dvh overflow-hidden text-white"
    >
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <HeroVideo src={HERO_VIDEO_SRC} className="absolute inset-0" />
        {/* Light shading only where text sits: behind the header and the lower-left copy. */}
        <div className="from-brand-950/35 absolute inset-x-0 top-0 h-40 bg-gradient-to-b to-transparent" />
        <div className="from-brand-950/60 absolute inset-0 bg-gradient-to-t via-transparent via-55%" />
        <div className="from-brand-950/25 absolute inset-0 bg-gradient-to-r to-transparent to-55%" />
      </div>

      {/* Sizes and spacing also scale with viewport height so the hero never exceeds one screen. */}
      <div className="w-full px-4 pt-36 pb-6 sm:px-10 sm:pt-40 sm:pb-[min(4rem,8svh)] lg:px-24 lg:pt-[10rem] lg:pb-[min(4.5rem,9svh)]">
        <h1
          id="hero-heading"
          className="text-[clamp(2.5rem,12.5vw,4rem)] leading-[0.86] font-normal tracking-[-0.035em] sm:text-[clamp(3rem,min(9vw,15svh),115px)]"
        >
          Sail into the
          <br />
          soul of <span className="ml-[0.08em] font-serif tracking-[-0.01em]">Kerala.</span>
        </h1>

        <div className="mt-8 sm:mt-[min(3.25rem,6.2svh)]">
          <HeroSearch />
        </div>
      </div>
    </section>
  );
}
