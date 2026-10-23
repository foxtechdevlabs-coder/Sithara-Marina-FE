import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { MarinaFonts } from "@/components/user/marina-chrome";
import { userRoutes } from "@/constants/routes";
import { cx } from "@/lib/cx";

const SWITZER = "font-['Switzer',ui-sans-serif,system-ui,sans-serif]";

/** Left-to-right shade over the photo, exactly as specified by design. */
const SHADE =
  "bg-[linear-gradient(101.67deg,rgba(0,0,0,0.9)_0%,rgba(4,18,30,0.4)_39.47%,rgba(4,18,30,0)_76.65%)]";

const buttonBase =
  "font-attribution inline-flex h-[3.25rem] items-center justify-center gap-4 px-7 text-[11px] leading-none tracking-[2.42px] uppercase transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white lg:h-[max(calc(var(--r)*54),2.75rem)] lg:px-[calc(var(--r)*32)]";

/**
 * Closing call to action: full-bleed backwaters photo under a dark gradient,
 * with the invitation and two buttons on the left. From `lg` sizes are
 * 1728px-reference pixels times `--r` (viewport width / 1728, capped so the
 * 800px-tall section fits one screen); small text has a readable minimum.
 */
export function JourneyCtaSection() {
  return (
    <section
      aria-labelledby="journey-cta-heading"
      className={cx(
        "bg-brand-950 relative isolate flex min-h-[40rem] items-center overflow-hidden text-white lg:h-[calc(var(--r)*800)] lg:min-h-0 lg:[--r:min(calc(100vw/1728),calc(100svh/800))]",
        SWITZER,
      )}
    >
      <MarinaFonts />
      {/* Switzer Light (300) for the body line; the shared loader covers 400–600. */}
      <link
        rel="stylesheet"
        href="https://api.fontshare.com/v2/css?f[]=switzer@300&display=swap"
        precedence="default"
      />

      <Image
        src="/images/home/destination-kerala-backwaters.png"
        alt=""
        fill
        sizes="100vw"
        className="-z-20 object-cover object-[62%_50%] lg:origin-[5%_16%] lg:scale-[1.24] lg:object-[50%_45%]"
      />
      <div aria-hidden="true" className={cx("absolute inset-0 -z-10", SHADE)} />

      <div className="px-5 py-20 sm:px-10 lg:px-[calc(100vw*90/1728)] lg:py-0">
        <p className="text-[0.6875rem] leading-none tracking-[0.18em] text-white/85 uppercase lg:text-[max(calc(var(--r)*11),10px)]">
          A conversation is all it takes.
        </p>
        <h2
          id="journey-cta-heading"
          className="mt-6 text-[3rem] leading-[1.08] font-normal tracking-[-0.03em] md:text-[4rem] lg:mt-[calc(var(--r)*28)] lg:text-[calc(var(--r)*76)] lg:leading-[calc(var(--r)*86)]"
        >
          Your Kerala
          <br />
          journey begins
          <br />
          <span className="font-serif tracking-[-0.01em]">on the water.</span>
        </h2>
        <p className="mt-8 text-[19px] leading-[30.4px] font-light tracking-normal text-[#FAFAF7]/85 lg:mt-[calc(var(--r)*44)] lg:text-[max(calc(var(--r)*19),16px)] lg:leading-[1.6]">
          Let us create a journey around you.
        </p>
        <div className="mt-8 flex flex-wrap gap-[0.875rem] lg:mt-[calc(var(--r)*44)] lg:gap-[calc(var(--r)*14)]">
          <Link
            href={userRoutes.planCharter}
            className={cx(buttonBase, "bg-surface text-brand-950 hover:bg-pearl font-medium")}
          >
            Plan your journey
            <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
          </Link>
          <Link
            href={userRoutes.yachts}
            className={cx(
              buttonBase,
              "border border-white/45 font-medium text-white hover:border-white hover:bg-white/10",
            )}
          >
            Explore the yachts
          </Link>
        </div>
      </div>
    </section>
  );
}
