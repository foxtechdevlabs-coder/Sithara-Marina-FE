/* eslint-disable @next/next/no-img-element -- mix of local and remote placeholder imagery; swap for next/image once assets are hosted */
import { ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { INK, MarinaFonts, MarinaFooter, SANS } from "@/components/user/marina-chrome";
import type { RelatedYacht } from "@/components/user/YachtDetails";
import { userRoutes } from "@/constants/routes";

/* ------------------------------------------------------------------ */
/* Figma colours                                                       */
/* ------------------------------------------------------------------ */

const BODY = "#4a4f55"; // paragraph text
const MUTED = "#7a7f85"; // breadcrumb
const META = "#555a60"; // metres / guests / suites
const AREA = "#8a8f94"; // small cruising-area label

/* ------------------------------------------------------------------ */
/* Data shape + DUMMY data                                             */
/* Replace `dummyFleet` with the API response once it is ready.        */
/* ------------------------------------------------------------------ */

export interface FleetYacht extends RelatedYacht {
  /** Cruising area shown at the right of the name, e.g. "Alleppey". */
  area: string;
}

const unsplash = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1300&q=80`;

export const dummyFleet: FleetYacht[] = [
  {
    id: "astra-one",
    name: "Astra One",
    location: "Kochi",
    area: "Kochi",
    image: {
      src: "/images/yachts/astra-one-arabian-sea.png",
      alt: "Astra One cruising off the Kerala coast",
    },
    lengthMetres: 46,
    guests: 12,
    suites: 6,
    description:
      "Our flagship superyacht. Spacious suites, open-air living, and the freedom to venture further.",
  },
  {
    id: "malabar",
    name: "Malabar",
    location: "Kochi",
    area: "Kochi",
    image: { src: unsplash("1569263979104-865ab7cd8d13"), alt: "Malabar motor yacht" },
    lengthMetres: 28,
    guests: 8,
    suites: 4,
    description:
      "An intimate coastal retreat, made for hidden anchorages and unhurried days on the Arabian Sea.",
  },
  {
    id: "neelam",
    name: "Neelam",
    location: "Kochi",
    area: "Alleppey",
    image: { src: unsplash("1593693411515-c20261bcad6e"), alt: "Neelam houseboat" },
    lengthMetres: 24,
    guests: 6,
    suites: 3,
    description:
      "The traditional Kerala houseboat, beautifully reimagined for a slower, more private escape.",
  },
  {
    id: "ananta",
    name: "Ananta",
    location: "Kochi",
    area: "Kochi",
    image: { src: unsplash("1540946485063-a40da27545f8"), alt: "Ananta sailing yacht" },
    lengthMetres: 26,
    guests: 8,
    suites: 4,
    description:
      "The romance of sailing, with every modern comfort. For those who prefer to follow the wind.",
  },
];

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

function Intro() {
  return (
    <>
      <nav aria-label="Breadcrumb" className="text-[12px] leading-[16px]" style={{ color: MUTED }}>
        <ol className="flex items-center gap-[12px]">
          <li>
            <Link href={userRoutes.home} className="hover:underline">
              Home
            </Link>
          </li>
          <li aria-hidden="true" className="text-[#b5b8bc]">
            /
          </li>
          <li aria-current="page" style={{ color: INK }}>
            Our yachts
          </li>
        </ol>
      </nav>

      <div className="mt-[48px] grid gap-8 lg:mt-[55px] lg:grid-cols-2 lg:items-end lg:gap-0">
        <div>
          <p
            className="text-[12px] leading-[16px] tracking-[0.18em] uppercase"
            style={{ color: INK }}
          >
            The Astra collection
          </p>
          {/* Figma: Switzer 400, 72px, letter-spacing -2.21px */}
          <h1
            className="mt-[22px] max-w-[500px] text-[48px] leading-[54px] font-normal tracking-[-1.5px] lg:text-[72px] lg:leading-[78px] lg:tracking-[-2.21px]"
            style={{ ...SANS, color: INK }}
          >
            Your own place on the water.
          </h1>
        </div>
        <p
          className="max-w-[340px] text-[14px] leading-[27px] lg:mb-[13px] lg:ml-[28%]"
          style={{ color: BODY }}
        >
          Four individual vessels. One considered approach to private yachting. From a coastal
          afternoon to a week away, find the yacht that feels like you.
        </p>
      </div>
    </>
  );
}

function YachtCard({ yacht }: { yacht: FleetYacht }) {
  const href = userRoutes.yacht(yacht.id);
  return (
    <article>
      <Link href={href} className="group relative block overflow-hidden" aria-label={yacht.name}>
        <img
          src={yacht.image.src}
          alt={yacht.image.alt}
          loading="lazy"
          className="aspect-[642/394] w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <span
          className="absolute top-[17px] left-[17px] flex h-[26px] items-center bg-white/95 px-[10px] text-[12px] tracking-[0.1em] uppercase"
          style={{ color: INK }}
        >
          {yacht.location}
        </span>
        <span
          aria-hidden="true"
          className="absolute right-[18px] bottom-[17px] flex size-[37px] items-center justify-center rounded-full border border-white/80 text-white transition-colors group-hover:bg-white/20"
        >
          <ArrowUpRight className="size-[16px]" strokeWidth={1.5} />
        </span>
      </Link>

      <div className="mt-[21px] flex items-baseline justify-between gap-4">
        <h2
          className="text-[36px] leading-[48px] tracking-[-0.5px] lg:text-[41px]"
          style={{ ...SANS, color: INK }}
        >
          {yacht.name}
        </h2>
        <span className="text-[9px] tracking-[0.15em] uppercase" style={{ color: AREA }}>
          {yacht.area}
        </span>
      </div>

      <p
        className="mt-[6px] flex items-center gap-[12px] text-[14px] leading-[20px]"
        style={{ color: META }}
      >
        {[`${yacht.lengthMetres} metres`, `${yacht.guests} guests`, `${yacht.suites} suites`].map(
          (m, i) => (
            <span key={m} className="flex items-center gap-[12px]">
              {i > 0 && <span aria-hidden="true" className="h-[10px] w-px bg-[#c4c7cb]" />}
              {m}
            </span>
          ),
        )}
      </p>

      <p className="mt-[13px] max-w-[495px] text-[16px] leading-[25px]" style={{ color: BODY }}>
        {yacht.description}
      </p>

      <div className="mt-[21px]">
        <Link
          href={href}
          className="group inline-flex items-center gap-[18px] border-b pb-[7px] text-[12px] leading-[16px] tracking-[0.18em] uppercase"
          style={{ color: INK, borderColor: INK }}
        >
          Discover {yacht.name}
          <ArrowRight
            className="size-[13px] transition-transform group-hover:translate-x-1"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </Link>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

/**
 * "Our yachts" listing screen, built from the Figma design (1728px frame).
 * Renders dummy data by default; pass the API response as `yachts` once it is ready.
 */
export default function OurYachts({ yachts = dummyFleet }: { yachts?: FleetYacht[] }) {
  return (
    <div className="bg-white antialiased" style={{ ...SANS, color: INK }}>
      <MarinaFonts />

      <section className="mx-auto w-full max-w-[1728px] px-5 pt-[37px] pb-[140px] lg:px-[clamp(40px,11.8vw,204px)] lg:pb-[211px]">
        <Intro />

        <div className="mt-[80px] grid gap-x-[36px] gap-y-[56px] md:grid-cols-2 lg:mt-[127px] lg:gap-y-[45px]">
          {yachts.map((yacht) => (
            <YachtCard key={yacht.id} yacht={yacht} />
          ))}
        </div>
      </section>

      <MarinaFooter />
    </div>
  );
}
