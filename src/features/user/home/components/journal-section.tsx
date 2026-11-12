import { ArrowRight, ArrowUpRight } from "lucide-react";
import Image from "next/image";

import { MarinaFonts } from "@/components/user/marina-chrome";
import { Reveal } from "@/components/shared/reveal";
import { cx } from "@/lib/cx";

const SWITZER = "font-['Switzer',ui-sans-serif,system-ui,sans-serif]";

const EYEBROW =
  "text-[0.6875rem] leading-none tracking-[0.18em] uppercase lg:text-[max(calc(var(--r)*11),10px)]";

// Content from the design reference. There is no journal route yet, so the
// "Visit the journal" and "Read the story" labels are plain text, not links.
const FEATURED_STORY = {
  category: "The art of slow travel",
  title: "In Kerala, the best things take their time.",
  image: "/images/home/journal-slow-travel.jpg",
  imageAlt: "A Kerala houseboat gliding along a misty, palm-lined backwater at dawn",
};

const STORIES = [
  {
    category: "Life on board",
    title: "A table with an ever-changing view.",
    image: "/images/home/journal-life-on-board.jpg",
    imageAlt: "A candlelit dinner table set on a yacht's deck at dusk",
  },
  {
    category: "Off the charted path",
    title: "The islands you’ll wish you’d found sooner.",
    image: "/images/home/journal-islands.jpg",
    imageAlt: "Aerial view of a palm-fringed island ringed by turquoise reef",
  },
] as const;

/**
 * "Notes from the water." journal teaser. From `lg`, horizontal sizes are
 * 1728px-reference pixels times `--rw` (viewport width / 1728) so columns sit
 * exactly as in the reference; heights and text use `--r`, the same scale
 * capped so the whole section fits one screen. Small text has a readable minimum.
 */
export function JournalSection() {
  return (
    <section
      aria-labelledby="journal-heading"
      className={cx(
        "bg-surface py-20 lg:px-[calc(var(--rw)*101)] lg:pt-[calc(var(--r)*155)] lg:pb-[calc(var(--r)*110)] lg:[--r:min(var(--rw),calc(100svh/905))] lg:[--rw:calc(100vw/1728)]",
        SWITZER,
      )}
    >
      <MarinaFonts />

      <div className="flex flex-wrap items-end justify-between gap-6 px-5 sm:px-10 lg:px-0">
        <div>
          <p className={cx(EYEBROW, "text-onyx")}>The Astra Journal</p>
          <Reveal as="h2"
            id="journal-heading"
            className="text-forest mt-4 text-[clamp(2rem,9.4vw,2.75rem)] leading-none font-normal tracking-[-0.03em] md:text-[3.5rem] lg:mt-[calc(var(--r)*20)] lg:text-[calc(var(--r)*72)]"
          >
            Notes from <span className="font-serif tracking-[-0.01em]">the water.</span>
          </Reveal>
        </div>
        <p className="text-brand-950 border-brand-950 inline-flex items-center gap-4 border-b pb-2 text-xs tracking-[0.18em] uppercase max-md:hidden lg:mb-[calc(var(--r)*2)] lg:text-[max(calc(var(--r)*12.5),11px)]">
          Visit the journal
          <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
        </p>
      </div>

      <div className="mt-12 grid gap-14 px-5 max-md:mt-8 max-md:gap-0 sm:px-10 lg:mt-[calc(var(--r)*70)] lg:grid-cols-[calc(var(--rw)*752)_1fr] lg:gap-x-[calc(var(--rw)*80)] lg:px-0">
        <Reveal as="article">
          <div className="relative aspect-[724/515] overflow-hidden md:aspect-[752/377] lg:aspect-auto lg:h-[calc(var(--r)*377)]">
            <Image
              src={FEATURED_STORY.image}
              alt={FEATURED_STORY.imageAlt}
              fill
              sizes="(min-width: 1024px) 44vw, 100vw"
              className="object-cover object-[50%_60%]"
            />
          </div>
          <p className={cx(EYEBROW, "text-[#767676] mt-6 max-md:mt-5 max-md:text-[0.625rem] lg:mt-[calc(var(--r)*24)]")}>
            {FEATURED_STORY.category}
          </p>
          <h3 className="text-forest mt-4 text-[1.75rem] leading-tight font-normal tracking-[-0.01em] max-md:mt-3 max-md:text-[1.125rem] lg:mt-[calc(var(--r)*20)] lg:text-[max(calc(var(--r)*32),22px)]">
            {FEATURED_STORY.title}
          </h3>
        </Reveal>

        <ul className="divide-y divide-[#DCDCDC] max-md:mt-7 max-md:border-y max-md:border-[#DCDCDC]">
          {STORIES.map((story) => (
            <Reveal as="li"
              key={story.title}
              className="py-5 md:py-7 md:first:pt-0 lg:py-[calc(var(--r)*28)] lg:first:pt-0"
            >
              <article className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-4 md:grid-cols-[14.375rem_1fr] md:items-start md:gap-10 lg:grid-cols-[calc(var(--rw)*230)_1fr] lg:gap-[calc(var(--rw)*40)]">
                <div className="relative aspect-[104/82] md:aspect-[230/170] lg:aspect-auto lg:h-[calc(var(--r)*170)]">
                  <Image
                    src={story.image}
                    alt={story.imageAlt}
                    fill
                    sizes="(min-width: 1024px) 14vw, 40vw"
                    className="object-cover"
                  />
                </div>
                <div className="lg:pt-[calc(var(--r)*22)]">
                  <p
                    className={cx(
                      EYEBROW,
                      "text-[#767676] text-[0.625rem] lg:text-[max(calc(var(--r)*10),9px)]",
                    )}
                  >
                    {story.category}
                  </p>
                  <h3 className="text-forest mt-2 max-w-[24rem] text-[0.9375rem] leading-[1.35] font-normal tracking-[-0.01em] md:mt-3 md:text-[1.75rem] md:leading-[1.18] lg:mt-[calc(var(--r)*14)] lg:max-w-[calc(var(--rw)*400)] lg:text-[max(calc(var(--r)*28),18px)]">
                    {story.title}
                  </h3>
                  <p className="mt-4 hidden items-center gap-5 text-xs text-[#767676] md:inline-flex lg:mt-[calc(var(--r)*22)] lg:text-[max(calc(var(--r)*12),11px)]">
                    Read the story
                    <ArrowRight aria-hidden="true" strokeWidth={1.25} className="size-3.5" />
                  </p>
                </div>
                <ArrowUpRight
                  aria-hidden="true"
                  strokeWidth={1.5}
                  className="text-brand-950 size-4 self-center md:hidden"
                />
              </article>
            </Reveal>
          ))}
        </ul>
      </div>

      <p className="text-brand-950 border-brand-950 mx-5 mt-12 inline-flex items-center gap-4 border-b pb-2 text-xs tracking-[0.18em] uppercase sm:mx-10 md:hidden">
        Visit the journal
        <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
      </p>
    </section>
  );
}
