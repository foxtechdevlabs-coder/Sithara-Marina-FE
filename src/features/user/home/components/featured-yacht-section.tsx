import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { userRoutes } from "@/constants/routes";
import { cx } from "@/lib/cx";

// Content from the design reference. Add yachts here; the slide controls
// below are disabled until there is more than one.
const FEATURED_YACHTS = [
  {
    name: "Astra One",
    specs: ["46 metres", "12 guests", "6 suites"],
    description:
      "Our flagship superyacht. Spacious suites, open-air living, and the freedom to venture further.",
    image: "/images/home/featured-yacht-astra-one.png",
    imageAlt: "Astra One, a white motor yacht, on still water at sunrise with palms behind",
  },
] as const;

/** Brand gradient for the round card button, exactly as specified by design. */
export const ROUND_BUTTON_GRADIENT =
  "bg-[linear-gradient(315.28deg,#0C2269_7.29%,#61B0F2_68.38%,#FFFFFF_115.11%)]";

const roundControl =
  "absolute flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white text-brand-950 disabled:cursor-default lg:size-[max(calc(var(--r)*80),2.75rem)]";

/**
 * "Featured yacht." showcase: an inset photo with the dotted arc, slide
 * controls and a white detail card.
 *
 * From `lg` sizes are written in 1728px-reference pixels times a scale:
 * - `--rw` (viewport width / 1728) sets the panel width, so it spans the page.
 * - `--r` is `--rw`, capped so the 1042px-tall panel fits one screen; every
 *   overlay (heading, arc, arrows, card) scales by it.
 * On tall screens the two match and the result is the reference exactly. On
 * shorter ones the photo, still full width, is shifted up by the scale
 * difference so the yacht and its reflection stay aligned with the overlays.
 * Small text and round buttons have readable / tappable minimum sizes.
 */
export function FeaturedYachtSection() {
  const activeIndex = 0;
  const yacht = FEATURED_YACHTS[activeIndex];
  const hasMultiple = FEATURED_YACHTS.length > 1;

  return (
    <section
      aria-labelledby="featured-heading"
      className="bg-surface font-brand pt-16 pb-5 lg:pt-[calc(var(--r)*66)] lg:pb-[calc(var(--r)*20)] lg:[--rw:calc(100vw/1728)] lg:[--r:min(var(--rw),calc((100svh-2.375rem)/1042))]"
    >
      <div className="relative min-h-[44rem] overflow-hidden text-white md:mx-4 md:min-h-[48rem] lg:mx-auto lg:h-[calc(var(--r)*1042)] lg:min-h-0 lg:w-[calc(var(--rw)*1691)]">
        <Image
          src={yacht.image}
          alt={yacht.imageAlt}
          fill
          sizes="(min-width: 1024px) 98vw, 100vw"
          className="object-cover object-[50%_40%] lg:object-[50%_calc((var(--r)-var(--rw))*500)]"
        />

        <div className="absolute inset-x-0 top-0 flex flex-col items-center px-5 pt-12 text-center lg:top-[calc(var(--r)*70)] lg:pt-0">
          <p className="text-[0.6875rem] tracking-[0.2em] uppercase lg:text-[max(calc(var(--r)*11),10px)]">
            The yacht collection
          </p>
          <h2
            id="featured-heading"
            className="mt-4 text-[2.75rem] leading-none font-normal tracking-[-0.03em] lg:mt-[calc(var(--r)*19)] lg:text-[calc(var(--r)*72.9)]"
          >
            Featured <span className="font-serif tracking-[-0.01em]">yacht.</span>
          </h2>
        </div>

        <div aria-hidden="true">
          <Image
            src="/images/home/featured-yacht-arc.png"
            alt=""
            width={1114}
            height={561}
            sizes="(min-width: 1024px) 62vw, 92vw"
            className="absolute top-[9.5rem] left-1/2 w-[min(92vw,40rem)] max-w-none -translate-x-1/2 lg:top-[calc(var(--r)*222)] lg:w-[calc(var(--r)*1065)]"
          />
          <div className="absolute top-[9.75rem] left-1/2 flex -translate-x-1/2 flex-col items-center lg:top-[calc(var(--r)*230)]">
            <span className="h-4 w-px bg-white lg:h-[calc(var(--r)*17)]" />
            <span className="mt-2 text-[0.8125rem] leading-none tracking-[0.08em] lg:mt-[calc(var(--r)*8)] lg:text-[max(calc(var(--r)*13),10px)]">
              {String(activeIndex + 1).padStart(2, "0")}
            </span>
          </div>
        </div>

        <button
          type="button"
          aria-label="Previous yacht"
          disabled={!hasMultiple}
          className={cx(
            roundControl,
            "top-[19rem] left-4 lg:top-[calc(var(--r)*508)] lg:left-[calc(var(--r)*110)]",
          )}
        >
          <ArrowLeft
            aria-hidden="true"
            strokeWidth={1.25}
            className="size-5 lg:size-[calc(var(--r)*24)]"
          />
        </button>
        <button
          type="button"
          aria-label="Next yacht"
          disabled={!hasMultiple}
          className={cx(
            roundControl,
            "top-[19rem] right-4 lg:top-[calc(var(--r)*508)] lg:right-[calc(var(--r)*110)]",
          )}
        >
          <ArrowRight
            aria-hidden="true"
            strokeWidth={1.25}
            className="size-5 lg:size-[calc(var(--r)*24)]"
          />
        </button>

        <div className="absolute inset-x-4 bottom-4 flex flex-col items-center gap-[1.375rem] md:inset-x-8 md:bottom-8 lg:inset-x-auto lg:bottom-[calc(var(--r)*107)] lg:left-1/2 lg:w-[max(calc(var(--r)*810),40rem)] lg:-translate-x-1/2 lg:gap-[calc(var(--r)*22)]">
          <ol
            aria-label="Featured yachts"
            className="flex gap-[1.1875rem] lg:gap-[calc(var(--r)*19)]"
          >
            {FEATURED_YACHTS.map((item, index) => (
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

          <article className="bg-surface grid w-full grid-cols-[1fr_3.5rem] items-center gap-x-6 gap-y-5 p-6 lg:grid-cols-[1fr_max(calc(var(--r)*300),14.375rem)_max(calc(var(--r)*56),2.75rem)] lg:gap-x-[calc(var(--r)*19)] lg:gap-y-0 lg:py-[calc(var(--r)*28)] lg:pr-[calc(var(--r)*39)] lg:pl-[calc(var(--r)*49)]">
            <div className="col-span-2 lg:col-span-1">
              <h3 className="text-onyx text-[2.5rem] leading-none font-normal tracking-[-0.02em] lg:text-[calc(var(--r)*42.8)]">
                {yacht.name}
              </h3>
              <ul className="text-onyx mt-6 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[0.9375rem] lg:mt-[calc(var(--r)*24)] lg:gap-x-[calc(var(--r)*14)] lg:text-[max(calc(var(--r)*15),12px)]">
                {yacht.specs.map((spec, index) => (
                  <li key={spec} className="flex items-center gap-3.5 lg:gap-[calc(var(--r)*14)]">
                    {index > 0 ? (
                      <span
                        aria-hidden="true"
                        className="bg-hairline h-2.5 w-px lg:h-[calc(var(--r)*10)]"
                      />
                    ) : null}
                    {spec}
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href={userRoutes.yachts}
              aria-label={`View ${yacht.name}`}
              className={cx(
                "order-last flex size-14 items-center justify-center self-end rounded-full text-white transition-transform duration-300 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0C2269] motion-reduce:transition-none lg:size-[max(calc(var(--r)*56),2.75rem)] lg:self-center",
                ROUND_BUTTON_GRADIENT,
              )}
            >
              <ArrowUpRight
                aria-hidden="true"
                strokeWidth={1.25}
                className="size-6 lg:size-[calc(var(--r)*24)]"
              />
            </Link>

            <div>
              <p className="text-sage max-w-[18.75rem] text-[0.8125rem] leading-[1.9] lg:max-w-none lg:text-[max(calc(var(--r)*13),10px)]">
                {yacht.description}
              </p>
              <Link
                href={userRoutes.yachts}
                className="text-brand-950 border-brand-950 mt-3 inline-block border-b pb-1 text-[0.6875rem] tracking-[0.2em] uppercase transition-opacity duration-300 hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current lg:mt-[calc(var(--r)*12)] lg:pb-[calc(var(--r)*4)] lg:text-[max(calc(var(--r)*11),10px)]"
              >
                Explore the yachts
              </Link>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
