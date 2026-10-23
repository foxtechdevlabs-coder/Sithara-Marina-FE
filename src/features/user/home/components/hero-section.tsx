import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { userRoutes } from "@/constants/routes";
import { cx } from "@/lib/cx";

import { HeroVideo } from "./hero-video";

const HERO_VIDEO_SRC = "/video/hero_yacht.mp4";

const buttonBase =
  "inline-flex h-[3.3125rem] items-center justify-center gap-6 px-[1.875rem] text-[0.6875rem] font-normal tracking-[0.2em] uppercase transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white";

/**
 * Cinematic opening of the home page, exactly one viewport tall (`100vh`, or
 * `100dvh` where supported) so Section 2 starts at the fold. The header floats
 * above it; the video is absolutely positioned and never sizes the hero.
 */
export function HeroSection() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="bg-brand-950 font-brand relative isolate flex h-screen min-h-[24rem] flex-col supports-[height:100dvh]:h-dvh justify-end overflow-hidden text-white"
    >
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <HeroVideo src={HERO_VIDEO_SRC} className="absolute inset-0" />
        {/* Light shading only where text sits: behind the header and the lower-left copy. */}
        <div className="from-brand-950/35 absolute inset-x-0 top-0 h-40 bg-gradient-to-b to-transparent" />
        <div className="from-brand-950/60 absolute inset-0 bg-gradient-to-t via-transparent via-55%" />
        <div className="from-brand-950/25 absolute inset-0 bg-gradient-to-r to-transparent to-55%" />
      </div>

      {/* Sizes and spacing also scale with viewport height so the hero never exceeds one screen. */}
      <div className="w-full px-5 pt-28 pb-16 sm:px-10 sm:pt-32 sm:pb-[min(6rem,12svh)] lg:px-24 lg:pt-[8.75rem] lg:pb-[min(7.5rem,14svh)]">
        <h1
          id="hero-heading"
          className="text-[clamp(3.25rem,14.5vw,4rem)] leading-[0.86] font-normal tracking-[-0.035em] sm:text-[clamp(3rem,min(9vw,15svh),115px)]"
        >
          Sail into the
          <br />
          soul of <span className="ml-[0.08em] font-serif tracking-[-0.01em]">Kerala.</span>
        </h1>

        <div className="mt-10 flex flex-col gap-3.5 sm:mt-[min(3.25rem,6.2svh)] sm:flex-row">
          <Link
            href={userRoutes.yachts}
            className={cx(
              buttonBase,
              "bg-surface text-brand-950 hover:bg-pearl active:bg-pearl/90",
            )}
          >
            Explore the yachts
            <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
          </Link>
          <Link
            href={userRoutes.contact}
            className={cx(
              buttonBase,
              "border border-white/45 text-white/90 hover:border-white hover:bg-white/10 hover:text-white active:bg-white/15",
            )}
          >
            Plan your journey
          </Link>
        </div>
      </div>
    </section>
  );
}
