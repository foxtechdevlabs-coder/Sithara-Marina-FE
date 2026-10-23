import { ArrowRight, ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { userRoutes } from "@/constants/routes";
import { cx } from "@/lib/cx";

import { ROUND_BUTTON_GRADIENT } from "./featured-yacht-section";

// Content from the design reference. Add destinations here; one indicator
// is shown per entry.
const DESTINATIONS = [
  {
    name: "Kerala Backwaters",
    description: "Palm-lined waterways, quiet villages, and the luxury of slowing down.",
    duration: "3–5 nights",
    season: "October – March",
    image: "/images/home/destination-kerala-backwaters.png",
    imageAlt: "A white motor yacht cruising palm-lined Kerala backwaters at sunset",
  },
] as const;

/**
 * "Follow a different horizon." destinations feature: photo with a white
 * detail card on the left, introduction on the right. From `lg` every size is
 * in 1728px-reference pixels times `--r` (viewport width / 1728), matching
 * the reference exactly at that width; small text has a readable minimum.
 */
export function DestinationsSection() {
  const activeIndex = 0;
  const destination = DESTINATIONS[activeIndex];

  return (
    <section
      aria-labelledby="destinations-heading"
      className="bg-surface font-brand py-16 lg:grid lg:grid-cols-[calc(var(--r)*834)_1fr] lg:gap-x-[calc(var(--r)*129)] lg:py-0 lg:pl-[calc(var(--r)*20)] lg:[--r:calc(100vw/1728)]"
    >
      <div className="px-5 sm:px-10 lg:px-0 lg:pt-[calc(var(--r)*100)]">
        <p className="text-onyx text-[0.6875rem] tracking-[0.2em] uppercase lg:text-[max(calc(var(--r)*11),10px)]">
          Places that stay with you
        </p>
        <h2
          id="destinations-heading"
          className="text-onyx mt-4 text-[2.75rem] leading-[1.03] font-normal tracking-[-0.03em] lg:mt-[calc(var(--r)*20)] lg:text-[calc(var(--r)*72.9)]"
        >
          Follow a
          <br />
          different <span className="font-serif tracking-[-0.01em]">horizon.</span>
        </h2>
        <p className="text-graphite mt-6 max-w-[28rem] text-[1.0625rem] leading-[1.3] lg:mt-[calc(var(--r)*19)] lg:max-w-[calc(var(--r)*445)] lg:text-[max(calc(var(--r)*17.5),15px)]">
          Our home waters and a little beyond. Discover a coast, an island, or a quiet corner of the
          world that feels like it was waiting for you.
        </p>
        <Link
          href={userRoutes.contact}
          className="border-brand-950 text-brand-950 hover:bg-brand-950 hover:text-pearl mt-8 inline-flex h-[3.3125rem] items-center gap-5 border px-[1.875rem] text-[0.6875rem] tracking-[0.2em] uppercase transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current lg:mt-[calc(var(--r)*43)] lg:h-[max(calc(var(--r)*53),2.75rem)] lg:w-[max(calc(var(--r)*265),13rem)] lg:justify-center lg:gap-[calc(var(--r)*20)] lg:px-0 lg:text-[max(calc(var(--r)*11),10px)]"
        >
          Explore destinations
          <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
        </Link>
      </div>

      {/* Phones: the card overlaps only the photo's lower edge. From `md` it sits inside the photo. */}
      <div className="relative mx-5 mt-12 sm:mx-10 md:aspect-[834/935] md:overflow-hidden lg:order-first lg:mx-0 lg:mt-0">
        <div className="relative aspect-[4/3] overflow-hidden md:absolute md:inset-0 md:aspect-auto">
          <Image
            src={destination.image}
            alt={destination.imageAlt}
            fill
            sizes="(min-width: 1024px) 48vw, 100vw"
            className="object-cover object-[58%_50%]"
          />
        </div>

        <ol
          aria-label="Destinations"
          className="absolute top-6 right-4 flex md:top-[44%] flex-col gap-[1.1875rem] lg:top-[calc(var(--r)*377)] lg:right-[calc(var(--r)*28)] lg:gap-[calc(var(--r)*19)]"
        >
          {DESTINATIONS.map((item, index) => (
            <li
              key={item.name}
              aria-current={index === activeIndex ? "true" : undefined}
              className={cx(
                "size-[0.4375rem] lg:size-[max(calc(var(--r)*7),5px)]",
                index === activeIndex ? "bg-white" : "bg-white/45",
              )}
            >
              <span className="sr-only">{item.name}</span>
            </li>
          ))}
        </ol>

        <article className="bg-surface relative mx-3 -mt-12 grid grid-cols-[1fr_auto] gap-x-4 p-5 sm:p-6 md:absolute md:inset-x-6 md:bottom-6 md:mx-0 md:mt-0 lg:inset-x-[calc(var(--r)*24)] lg:bottom-[calc(var(--r)*26)] lg:h-[calc(var(--r)*200)] lg:pt-[calc(var(--r)*36)] lg:pr-[calc(var(--r)*24)] lg:pb-0 lg:pl-[calc(var(--r)*24)]">
          <div>
            <h3 className="text-onyx text-[1.625rem] leading-tight font-normal tracking-[-0.01em] lg:text-[max(calc(var(--r)*29.5),20px)]">
              {destination.name}
            </h3>
            <p className="text-onyx mt-3 max-w-[22rem] text-[0.9375rem] leading-[1.65] lg:mt-[calc(var(--r)*12)] lg:max-w-[calc(var(--r)*345)] lg:text-[max(calc(var(--r)*15),12px)]">
              {destination.description}
            </p>
            <ul className="mt-4 flex flex-wrap gap-2 text-[0.75rem] tracking-[0.12em] uppercase lg:mt-[calc(var(--r)*20)] lg:gap-[calc(var(--r)*9)] lg:text-[max(calc(var(--r)*13),10px)]">
              <li className="bg-black px-2.5 py-1 leading-tight text-white lg:px-[calc(var(--r)*10)] lg:py-[calc(var(--r)*5)]">
                {destination.duration}
              </li>
              <li className="text-onyx bg-[#eaeaea] px-2.5 py-1 leading-tight lg:px-[calc(var(--r)*10)] lg:py-[calc(var(--r)*5)]">
                {destination.season}
              </li>
            </ul>
          </div>

          <Link
            href={userRoutes.contact}
            aria-label={`Explore ${destination.name}`}
            className={cx(
              "flex size-11 items-center justify-center self-start rounded-full text-white transition-transform duration-300 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0C2269] motion-reduce:transition-none lg:-mt-[calc(var(--r)*12)] lg:size-[max(calc(var(--r)*45),2.75rem)]",
              ROUND_BUTTON_GRADIENT,
            )}
          >
            <ArrowUpRight aria-hidden="true" strokeWidth={1.25} className="size-5" />
          </Link>
        </article>
      </div>
    </section>
  );
}
