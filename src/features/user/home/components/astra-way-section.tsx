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
  "mt-10 self-start text-[12.89px] leading-none font-medium tracking-[1.76px] uppercase md:mt-auto lg:text-[max(calc(var(--r)*12.89),10px)]";

// Copy from the design reference; all four features share the same description there.
const FEATURE_COPY =
  "Our network of approved charter brokers have access to the entire market and possess the specialist knowledge";

type Tile =
  // `href` is omitted while a tile's destination page does not exist yet.
  | { kind: "feature"; title: string; icon: LucideIcon; href?: Route; highlight?: boolean }
  | { kind: "image"; src: string; alt: string; position?: string };

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

      <div className="px-5 text-center">
        <p className="text-onyx text-xs leading-[16.2px] font-normal tracking-[1.9px] uppercase lg:text-[max(calc(var(--r)*12),10px)]">
          The Astra Way
        </p>
        <h2
          id="astra-way-heading"
          className="text-onyx mt-6 text-[clamp(2.125rem,11vw,2.75rem)] leading-[1.05] font-normal tracking-normal md:text-[3.5rem] lg:mt-[calc(var(--r)*24)] lg:text-[calc(var(--r)*72)]"
        >
          It’s the little things
          <br />
          that <span className="font-serif">make it yours.</span>
        </h2>
        <p className="text-graphite mx-auto mt-6 max-w-[412px] text-lg leading-[1.2] font-normal lg:mt-[calc(var(--r)*24)] lg:max-w-[max(calc(var(--r)*412),20rem)] lg:text-[max(calc(var(--r)*18),14px)]">
          The best kind of luxury feels natural. A warm welcome. Your favourite flavours. A day with
          nothing on the agenda but possibility.
        </p>
      </div>

      <ul className="mx-5 mt-14 grid sm:mx-10 md:grid-cols-2 lg:mx-[calc(100vw*20/1728)] lg:mt-[calc(var(--r)*90)] lg:grid-cols-4">
        {TILES.map((tile) =>
          tile.kind === "image" ? (
            <li
              key={tile.src}
              className="relative aspect-[4/3] md:aspect-square lg:aspect-auto lg:h-[calc(var(--r)*422)]"
            >
              <Image
                src={tile.src}
                alt={tile.alt}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 768px) 50vw, 100vw"
                className="object-cover"
                style={{ objectPosition: tile.position }}
              />
            </li>
          ) : (
            <li
              key={tile.title}
              className={cx(
                "flex flex-col px-8 py-10 md:aspect-square lg:aspect-auto lg:h-[calc(var(--r)*422)] lg:pt-[calc(var(--r)*50)] lg:pr-[calc(var(--r)*40)] lg:pb-[calc(var(--r)*50)] lg:pl-[calc(var(--r)*47)]",
                tile.highlight ? cx(BAR_KITCHEN_GRADIENT, "text-white") : "bg-[#F9F8F8] text-onyx",
              )}
            >
              <tile.icon
                aria-hidden="true"
                strokeWidth={1.25}
                className="size-10 lg:size-[max(calc(var(--r)*42),1.75rem)]"
              />
              <h3 className="mt-9 font-serif text-[32.82px] leading-none font-normal lg:mt-[calc(var(--r)*38)] lg:text-[max(calc(var(--r)*32.82),22px)]">
                {tile.title}
              </h3>
              <p
                className={cx(
                  "mt-5 max-w-[328.22px] text-[15.24px] leading-[1.6] font-normal lg:mt-[calc(var(--r)*20)] lg:max-w-[calc(var(--r)*328.22)] lg:text-[max(calc(var(--r)*15.24),12px)]",
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
