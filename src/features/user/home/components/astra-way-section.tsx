import { CircleCheck, MapPin, Ship, ShipWheel, type LucideIcon } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";

import { MarinaFonts } from "@/components/user/marina-chrome";
import { userRoutes } from "@/constants/routes";
import { cx } from "@/lib/cx";

/** Blue gradient of the "Bar & Kitchen" tile, exactly as specified by design. */
const BAR_KITCHEN_GRADIENT = "bg-[linear-gradient(182.29deg,#4E90D4_1.92%,#FAFAFA_149.84%)]";

const SWITZER = "font-['Switzer',ui-sans-serif,system-ui,sans-serif]";

const LEARN_MORE =
  "mt-10 max-md:mt-auto max-md:pt-6 max-md:text-[11px] self-start text-[12.89px] leading-none font-medium tracking-[1.76px] uppercase md:mt-auto lg:text-[max(calc(var(--r)*12.89),10px)]";

// Copy from the design reference; all four features share the same description there.
const FEATURE_COPY =
  "Our network of approved charter brokers have access to the entire market and possess the specialist knowledge";

type Tile =
  // `href` is omitted while a tile's destination page does not exist yet.
  | { kind: "feature"; title: string; icon: LucideIcon; href?: Route; highlight?: boolean }
  | { kind: "image"; src: string; alt: string; position?: string };

/**
 * Phones: the tiles sit in two rows that scroll sideways, alternating feature
 * and photo like a checkerboard. Index = position in TILES.
 */
const MOBILE_PLACE = [
  "max-md:col-start-1 max-md:row-start-1",
  "max-md:col-start-2 max-md:row-start-1",
  "max-md:col-start-2 max-md:row-start-2",
  "max-md:col-start-1 max-md:row-start-2",
  "max-md:col-start-3 max-md:row-start-2",
  "max-md:col-start-3 max-md:row-start-1",
  "max-md:col-start-4 max-md:row-start-1",
  "max-md:col-start-4 max-md:row-start-2",
] as const;

// Reading order = the reference's 4 × 2 grid, left to right, top to bottom.
const TILES: readonly Tile[] = [
  { kind: "feature", title: "Luxury Yachts", icon: ShipWheel, href: userRoutes.yachts },
  {
    kind: "image",
    src: "/images/home/astra-luxury-couple.jpg",
    alt: "A couple relaxing on the sun deck of a yacht off a palm-lined coast",
    position: "50% 20%",
  },
  { kind: "feature", title: "Skilled Crew", icon: Ship },
  {
    kind: "image",
    src: "/images/home/astra-houseboat-deck.jpg",
    alt: "The carved bow and lounge deck of a Kerala houseboat on still water",
    position: "100% 50%",
  },
  {
    kind: "image",
    src: "/images/home/about-heritage.png",
    alt: "A private yacht at rest on calm water at dusk",
    position: "58% 50%",
  },
  { kind: "feature", title: "Great Destinations", icon: MapPin, href: userRoutes.planCharter },
  {
    kind: "image",
    src: "/images/home/astra-yacht-deck-sunset.png",
    alt: "A yacht's side deck at sunset with a houseboat on the backwaters behind",
    position: "62% 50%",
  },
  {
    kind: "feature",
    title: "Bar & Kitchen",
    icon: CircleCheck,
    href: userRoutes.planCharter,
    highlight: true,
  },
];

/**
 * "The Astra Way": centred introduction over a 4 × 2 grid of feature and photo
 * tiles. From `lg`, sizes are 1728px-reference pixels times a scale: the grid
 * spans the page width, while `--r` (width scale, capped so the whole section
 * fits one screen) sets every height and text size. Small text has a
 * readable minimum.
 */
export function AstraWaySection() {
  return (
    <section
      aria-labelledby="astra-way-heading"
      className={cx(
        "bg-surface pt-20 pb-5 lg:pt-[calc(var(--r)*60)] lg:pb-[calc(var(--r)*21)] lg:[--r:min(calc(100vw/1728),calc(100svh/1345))]",
        SWITZER,
      )}
    >
      <MarinaFonts />

      <div className="px-5 text-left md:text-center">
        <p className="text-onyx text-xs leading-[16.2px] font-normal tracking-[1.9px] uppercase lg:text-[max(calc(var(--r)*12),10px)]">
          The Astra Way
        </p>
        <h2
          id="astra-way-heading"
          className="text-onyx mt-6 text-[clamp(2.125rem,9vw,2.375rem)] leading-[1.1] font-normal tracking-[-0.02em] md:text-[3.5rem] md:tracking-normal md:leading-[1.05] lg:mt-[calc(var(--r)*24)] lg:text-[calc(var(--r)*72)]"
        >
          It’s the little things
          <br />
          that <span className="font-serif">make it yours.</span>
        </h2>
        <p className="text-graphite mt-6 max-w-[412px] text-[0.9375rem] leading-[1.45] md:mx-auto md:text-lg md:leading-[1.2] font-normal lg:mt-[calc(var(--r)*24)] lg:max-w-[max(calc(var(--r)*412),20rem)] lg:text-[max(calc(var(--r)*18),14px)]">
          The best kind of luxury feels natural. A warm welcome. Your favourite flavours. A day with
          nothing on the agenda but possibility.
        </p>
      </div>

      <ul className="mx-5 mt-14 grid max-md:relative max-md:mt-10 max-md:mr-0 max-md:snap-x max-md:snap-mandatory max-md:auto-cols-[70vw] max-md:grid-flow-col max-md:grid-rows-[16rem_16rem] max-md:gap-x-4 max-md:gap-y-[1.625rem] max-md:overflow-x-auto max-md:pr-5 max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden sm:ml-10 md:mx-10 md:grid-cols-2 lg:mx-[calc(100vw*20/1728)] lg:mt-[calc(var(--r)*90)] lg:grid-cols-4">
        {TILES.map((tile, index) =>
          tile.kind === "image" ? (
            <li
              key={tile.src}
              className={cx(
                "relative max-md:snap-start md:aspect-square lg:aspect-auto lg:h-[calc(var(--r)*422)]",
                MOBILE_PLACE[index],
              )}
            >
              <Image
                src={tile.src}
                alt={tile.alt}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 70vw"
                className="object-cover"
                style={{ objectPosition: tile.position }}
              />
            </li>
          ) : (
            <li
              key={tile.title}
              className={cx(
                "flex flex-col px-8 py-10 max-md:snap-start max-md:px-4 max-md:pt-5 max-md:pb-6 md:aspect-square lg:aspect-auto lg:h-[calc(var(--r)*422)] lg:pt-[calc(var(--r)*50)] lg:pr-[calc(var(--r)*40)] lg:pb-[calc(var(--r)*50)] lg:pl-[calc(var(--r)*47)]",
                tile.highlight ? cx(BAR_KITCHEN_GRADIENT, "text-white") : "bg-[#F9F8F8] text-onyx",
                MOBILE_PLACE[index],
              )}
            >
              <tile.icon
                aria-hidden="true"
                strokeWidth={1.25}
                className="size-10 max-md:size-9 lg:size-[max(calc(var(--r)*42),1.75rem)]"
              />
              <h3 className="mt-9 font-serif text-[32.82px] max-md:mt-6 max-md:font-[inherit] max-md:text-[1rem] max-md:font-medium max-md:tracking-[-0.01em] leading-none font-normal lg:mt-[calc(var(--r)*38)] lg:text-[max(calc(var(--r)*32.82),22px)]">
                {tile.title}
              </h3>
              <p
                className={cx(
                  "mt-5 max-w-[328.22px] text-[15.24px] max-md:mt-3 max-md:text-[0.8125rem] max-md:leading-[1.55] leading-[1.6] font-normal lg:mt-[calc(var(--r)*20)] lg:max-w-[calc(var(--r)*328.22)] lg:text-[max(calc(var(--r)*15.24),12px)]",
                  tile.highlight ? "text-white" : "text-black/80",
                )}
              >
                {FEATURE_COPY}
              </p>
              {tile.href ? (
                <Link
                  href={tile.href}
                  className={cx(
                    LEARN_MORE,
                    "transition-opacity duration-300 hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current",
                  )}
                >
                  Learn more
                  {tile.highlight ? <span aria-hidden="true"> +</span> : null}
                  <span className="sr-only"> about {tile.title}</span>
                </Link>
              ) : (
                <p className={LEARN_MORE}>Learn more</p>
              )}
            </li>
          ),
        )}
      </ul>
    </section>
  );
}
