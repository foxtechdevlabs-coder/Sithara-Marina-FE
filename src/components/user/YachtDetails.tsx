/* eslint-disable @next/next/no-img-element -- remote placeholder imagery; swap for next/image once assets are hosted */
import { ArrowRight, Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import journeyImage from "@/components/assets/Image.png";
import gallery1 from "@/components/assets/Image (A thoughtfully set private dining table at sea).png";
import gallery2 from "@/components/assets/Image (A thoughtfully set private dining table at sea) (1).png";
import gallery3 from "@/components/assets/Image (A thoughtfully set private dining table at sea) (2).png";
import gallery4 from "@/components/assets/Image (A thoughtfully set private dining table at sea) (3).png";
import gallery5 from "@/components/assets/Image (A thoughtfully set private dining table at sea) (4).png";
import gallery6 from "@/components/assets/Image (A thoughtfully set private dining table at sea) (5).png";
import heroAsset from "@/components/assets/Image (An elegant white superyacht at sea under a clear blue sky).png";
import {
  INK,
  MarinaFonts,
  MarinaFooter,
  MarinaHeader,
  SANS,
  SERIF,
} from "@/components/user/marina-chrome";
import { userRoutes } from "@/constants/routes";

/* ------------------------------------------------------------------ */
/* Design tokens (local to this screen)                                */
/* ------------------------------------------------------------------ */

const img = (id: string, w = 1600) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

/* ------------------------------------------------------------------ */
/* Data shape + DUMMY data                                             */
/* Replace `dummyYachtDetails` with the API response once it is ready. */
/* ------------------------------------------------------------------ */

export interface YachtImage {
  src: string;
  alt: string;
}

export interface YachtStat {
  value: string;
  label: string;
}

export interface RelatedYacht {
  id: string;
  name: string;
  location: string;
  image: YachtImage;
  lengthMetres: number;
  guests: number;
  suites: number;
  description: string;
}

export interface YachtDetailsData {
  id: string;
  name: string;
  region: string;
  intro: string;
  heroImage: YachtImage;
  stats: YachtStat[];
  aboutTitle: string;
  about: string;
  features: string[];
  ratePerDay: number;
  charterDetails: { label: string; value: string }[];
  gallery: YachtImage[];
  relatedYachts: RelatedYacht[];
}

export const dummyYachtDetails: YachtDetailsData = {
  id: "astra-one",
  name: "Astra One",
  region: "Kochi · Lakshadweep",
  intro:
    "Our flagship superyacht. Spacious suites, open-air living, and the freedom to venture further.",
  heroImage: {
    src: heroAsset.src,
    alt: "Astra One cruising off the coast",
  },
  stats: [
    { value: "46m", label: "Length overall" },
    { value: "12", label: "Guests on board" },
    { value: "6", label: "Private suites" },
    { value: "9", label: "Dedicated crew" },
  ],
  aboutTitle: "A little further from everyday.",
  about:
    "A world of your own, with the horizon as its only boundary. Our flagship pairs expansive teak decks and beautifully appointed suites with intuitive, discreet service. From slow mornings in Kochi to star-filled evenings in the islands, Astra One makes every moment yours.",
  features: [
    "Private chef & personalised menus",
    "Six ocean-view suites",
    "Sun deck & outdoor lounge",
    "Water toys & snorkelling equipment",
    "Dedicated captain & nine-person crew",
    "Bespoke island itineraries",
  ],
  ratePerDay: 450000,
  charterDetails: [
    { label: "Cruising region", value: "Kochi · Lakshadweep" },
    { label: "Your company", value: "Up to 12 guests" },
    { label: "Charter style", value: "Private, fully crewed" },
  ],
  gallery: [
    { src: gallery1.src, alt: "Master suite with floor-to-ceiling ocean views" },
    { src: gallery2.src, alt: "Marble en-suite bathroom with porthole" },
    { src: gallery3.src, alt: "Private dining table set at sea" },
    { src: gallery4.src, alt: "Main saloon lounge" },
    { src: gallery5.src, alt: "Galley kitchen" },
    { src: gallery6.src, alt: "Media lounge and bar" },
  ],
  relatedYachts: [
    {
      id: "malabar",
      name: "Malabar",
      location: "Kochi",
      image: { src: img("1569263979104-865ab7cd8d13", 1000), alt: "Malabar motor yacht" },
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
      image: { src: img("1593693411515-c20261bcad6e", 1000), alt: "Neelam houseboat" },
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
      image: { src: img("1540946485063-a40da27545f8", 1000), alt: "Ananta sailing yacht" },
      lengthMetres: 26,
      guests: 8,
      suites: 4,
      description:
        "The romance of sailing, with every modern comfort. For those who prefer to follow the wind.",
    },
  ],
};

const formatRate = (amount: number) => `₹ ${amount.toLocaleString("en-IN")}`;

/* ------------------------------------------------------------------ */
/* Figma colours                                                       */
/* ------------------------------------------------------------------ */

const BODY = "#4a4f55"; // paragraph text
const MUTED = "#7a7f85"; // breadcrumb, meta
const CARD = "#041427"; // charter card

/** Content frame: 100px side margins on the 1728px Figma frame. */
const FRAME = "mx-auto w-full max-w-[1728px] px-5 lg:px-[100px]";

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */

function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <p
      className="text-[12px] leading-[16px] tracking-[0.18em] uppercase"
      style={{ color: light ? "#ffffff" : INK }}
    >
      {children}
    </p>
  );
}

function UnderlineLink({ children, href = "#" }: { children: ReactNode; href?: string }) {
  return (
    <a
      href={href}
      className="group inline-flex items-center gap-[18px] border-b pb-[7px] text-[12px] leading-[16px] tracking-[0.18em] uppercase"
      style={{ color: INK, borderColor: INK }}
    >
      {children}
      <ArrowRight
        className="size-[13px] transition-transform group-hover:translate-x-1"
        strokeWidth={1.5}
        aria-hidden="true"
      />
    </a>
  );
}

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

function TitleBlock({ yacht }: { yacht: YachtDetailsData }) {
  return (
    <section className={`${FRAME} pt-[37px]`}>
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
          <li>
            <Link href={userRoutes.yachts} className="hover:underline">
              Our yachts
            </Link>
          </li>
          <li aria-hidden="true" className="text-[#b5b8bc]">
            /
          </li>
          <li aria-current="page" style={{ color: INK }}>
            {yacht.name}
          </li>
        </ol>
      </nav>

      <div className="mt-[50px] grid gap-8 pb-[56px] lg:mt-[70px] lg:grid-cols-2 lg:gap-0 lg:pb-[66px]">
        {/* Figma: Switzer 400, 103px / 103px, letter-spacing -2px */}
        <h1
          className="text-[64px] leading-[64px] font-normal tracking-[-1px] lg:text-[103px] lg:leading-[103px] lg:tracking-[-2px]"
          style={{ ...SANS, color: INK }}
        >
          {yacht.name}
        </h1>
        <div className="lg:pl-[60px]">
          <p className="max-w-[390px] text-[14px] leading-[27px]" style={{ color: "#6b7068" }}>
            {yacht.intro}
          </p>
          <div className="mt-[23px]">
            <UnderlineLink>Enquire about this yacht</UnderlineLink>
          </div>
        </div>
      </div>
    </section>
  );
}

function Hero({ yacht }: { yacht: YachtDetailsData }) {
  return (
    <section className="relative mx-auto w-full max-w-[1728px]">
      <img
        src={yacht.heroImage.src}
        alt={yacht.heroImage.alt}
        className="h-[300px] w-full object-cover md:h-[440px] lg:h-[579px]"
      />
      <span
        className="absolute top-[24px] left-5 flex h-[35px] items-center bg-white px-[20px] text-[14px] lg:top-[34px] lg:left-[100px]"
        style={{ color: INK }}
      >
        {yacht.region}
      </span>
    </section>
  );
}

function Stats({ yacht }: { yacht: YachtDetailsData }) {
  return (
    <section className="mx-auto w-full max-w-[1728px] px-5 pt-[45px] lg:pr-[3.36%] lg:pl-[4.05%]">
      <ul className="grid grid-cols-2 gap-y-10 lg:grid-cols-4">
        {yacht.stats.map((stat, i) => (
          <li
            key={stat.label}
            className={`relative flex flex-col items-center justify-center gap-2 text-center min-[400px]:flex-row min-[400px]:gap-[17px] min-[400px]:text-left ${
              i < yacht.stats.length - 1
                ? "lg:after:absolute lg:after:top-1/2 lg:after:right-[10%] lg:after:h-[47px] lg:after:w-px lg:after:-translate-y-1/2 lg:after:bg-[#dcdfe2]"
                : ""
            }`}
          >
            <span
              className="text-[44px] leading-none tracking-[-1px] lg:text-[58px]"
              style={{ ...SANS, color: INK }}
            >
              {stat.value}
            </span>
            <span className="max-w-[90px] text-[14px] leading-[17px]" style={{ color: "#555a60" }}>
              {stat.label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CharterCard({ yacht }: { yacht: YachtDetailsData }) {
  return (
    <aside
      className="w-full max-w-[447px] self-start px-[33px] pt-[34px] pb-[33px] text-white"
      style={{ backgroundColor: CARD }}
    >
      <p className="text-[12px] leading-[16px] tracking-[0.18em] text-white/75 uppercase">
        Your private charter
      </p>
      <h3
        className="mt-[18px] max-w-[300px] text-[36px] leading-[42px] tracking-[-0.5px]"
        style={SANS}
      >
        Make {yacht.name} your own.
      </h3>

      <div className="mt-[24px] h-px bg-white/15" />

      <p className="mt-[22px] text-[16px] leading-[22px] text-white/50">Indicative rate from</p>
      <p className="mt-[8px] text-[44px] leading-[48px] tracking-[-0.5px]" style={SANS}>
        {formatRate(yacht.ratePerDay)}
      </p>
      <p className="mt-[6px] text-[16px] leading-[22px]">per day</p>

      <dl className="mt-[20px] text-[15px] leading-[20px]">
        {yacht.charterDetails.map((row) => (
          <div
            key={row.label}
            className="flex h-[44px] items-center justify-between border-t border-white/15"
          >
            <dt className="text-white/45">{row.label}</dt>
            <dd className="text-white">{row.value}</dd>
          </div>
        ))}
      </dl>

      <Link
        href={userRoutes.planCharter}
        className="mt-[24px] flex h-[50px] items-center justify-between px-[16px] text-[12px] tracking-[0.18em] uppercase transition-opacity hover:opacity-90"
        style={{
          color: INK,
          background: "linear-gradient(90deg, #f4f8fd 0%, #cfe2f8 45%, #69aef0 100%)",
        }}
      >
        Enquire about {yacht.name}
        <ArrowRight className="size-[13px]" strokeWidth={1.5} aria-hidden="true" />
      </Link>

      <p className="mt-[20px] text-[12px] leading-[20px] text-white/80">
        Rates are indicative. Your personal proposal will confirm availability, itinerary, taxes,
        and inclusions. No payment is taken when you enquire.
      </p>
    </aside>
  );
}

function LifeAboard({ yacht }: { yacht: YachtDetailsData }) {
  return (
    <section className={`${FRAME} pt-[80px] lg:pt-[97px]`}>
      <div className="grid gap-12 xl:grid-cols-[minmax(0,1fr)_447px] xl:gap-[80px]">
        <div>
          <div className="pt-[2px]">
            <Eyebrow>Life aboard {yacht.name}</Eyebrow>
          </div>
          <h2
            className="mt-[22px] max-w-[360px] text-[40px] leading-[44px] tracking-[-1.5px] lg:text-[56px] lg:leading-[58px]"
            style={{ ...SANS, color: INK }}
          >
            {yacht.aboutTitle}
          </h2>
          <p className="mt-[25px] max-w-[790px] text-[16px] leading-[27px]" style={{ color: BODY }}>
            {yacht.about}
          </p>

          <h3
            className="mt-[70px] text-[28px] leading-[40px] tracking-[-0.5px] lg:text-[32px]"
            style={{ ...SANS, color: INK }}
          >
            Every detail, considered.
          </h3>
          <ul className="mt-[20px] grid gap-y-[14.5px] sm:grid-cols-[minmax(0,405px)_minmax(0,1fr)]">
            {yacht.features.map((feature) => (
              <li
                key={feature}
                className="flex items-center gap-[13px] text-[16px] leading-[24px]"
                style={{ color: BODY }}
              >
                <Check
                  className="size-[13px] shrink-0"
                  strokeWidth={1.5}
                  style={{ color: BODY }}
                  aria-hidden="true"
                />
                {feature}
              </li>
            ))}
          </ul>
        </div>

        <CharterCard yacht={yacht} />
      </div>
    </section>
  );
}

function Gallery({ yacht }: { yacht: YachtDetailsData }) {
  return (
    <section className={`${FRAME} pt-[48px] lg:pt-[17px]`}>
      <h2
        className="text-[28px] leading-[40px] tracking-[-0.5px] lg:text-[32px]"
        style={{ ...SANS, color: INK }}
      >
        Life on board.
      </h2>
      <div className="mt-[36px] grid max-w-[1522px] grid-cols-2 gap-[12px] md:grid-cols-3 lg:gap-[17px]">
        {yacht.gallery.map((photo) => (
          <figure key={photo.src} className="overflow-hidden">
            <img
              src={photo.src}
              alt={photo.alt}
              loading="lazy"
              className="aspect-[496/345] w-full object-cover transition-transform duration-700 hover:scale-105"
            />
          </figure>
        ))}
      </div>
    </section>
  );
}

function Collection({ yachts }: { yachts: RelatedYacht[] }) {
  return (
    <section className={`${FRAME} pt-[96px] pb-[120px] lg:pt-[120px] lg:pb-[169px]`}>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Eyebrow>More from the collection</Eyebrow>
          <h2
            className="mt-[19px] text-[40px] leading-[44px] tracking-[-1.5px] lg:text-[56px] lg:leading-[58px]"
            style={{ ...SANS, color: INK }}
          >
            A different kind of escape.
          </h2>
        </div>
        <Link
          href={userRoutes.yachts}
          className="group mb-[36px] inline-flex w-[176px] items-center justify-between border-b pb-[7px] text-[12px] leading-[16px] tracking-[0.18em] uppercase"
          style={{ color: INK, borderColor: INK }}
        >
          All our yachts
          <ArrowRight
            className="size-[13px] transition-transform group-hover:translate-x-1"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </Link>
      </div>

      <div className="mt-[51px] grid gap-12 md:grid-cols-3 md:gap-[32px]">
        {yachts.map((item) => (
          <article key={item.id}>
            <div className="relative overflow-hidden">
              <img
                src={item.image.src}
                alt={item.image.alt}
                loading="lazy"
                className="aspect-[488/297] w-full object-cover transition-transform duration-700 hover:scale-105"
              />
              <span
                className="absolute top-[17px] left-[17px] flex h-[30px] items-center bg-white/95 px-[10px] text-[14px]"
                style={{ color: INK }}
              >
                {item.location}
              </span>
            </div>
            <h3
              className="mt-[18px] text-[36px] leading-[44px] tracking-[-0.5px]"
              style={{ ...SANS, color: INK }}
            >
              {item.name}
            </h3>
            <p
              className="mt-[7px] flex items-center gap-[14px] text-[14px] leading-[20px]"
              style={{ color: "#555a60" }}
            >
              {[
                `${item.lengthMetres} metres`,
                `${item.guests} guests`,
                `${item.suites} suites`,
              ].map((m, i) => (
                <span key={m} className="flex items-center gap-[14px]">
                  {i > 0 && <span aria-hidden="true" className="h-[10px] w-px bg-[#c4c7cb]" />}
                  {m}
                </span>
              ))}
            </p>
            <p
              className="mt-[12px] max-w-[400px] text-[16px] leading-[25px]"
              style={{ color: BODY }}
            >
              {item.description}
            </p>
            <div className="mt-[27px]">
              <UnderlineLink href={userRoutes.yacht(item.id)}>Discover {item.name}</UnderlineLink>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function JourneyCta() {
  return (
    <section className="relative mx-auto w-full max-w-[1728px] overflow-hidden text-white lg:h-[801px]">
      <Image
        src={journeyImage}
        alt=""
        aria-hidden="true"
        fill
        sizes="100vw"
        className="object-cover object-right"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, rgba(3,24,30,0.78) 0%, rgba(3,24,30,0.62) 40%, rgba(3,24,30,0.38) 70%, rgba(3,24,30,0.3) 100%)",
        }}
      />
      <div className="relative px-5 py-[96px] lg:px-[105px] lg:pt-[169px] lg:pb-0">
        <p className="text-[13px] leading-[16px] tracking-[0.15em] uppercase">
          A conversation is all it takes
        </p>
        {/* Figma: Switzer 400, 72px / 84px, letter-spacing -2.21px */}
        <h2 className="mt-[20px] text-[52px] leading-[60px] tracking-[-1.5px] lg:text-[72px] lg:leading-[84px] lg:tracking-[-2.21px]">
          <span style={SANS}>
            Your Kerala
            <br />
            journey begins
          </span>
          <br />
          <span className="tracking-[-1px]" style={SERIF}>
            on the water.
          </span>
        </h2>
        <p className="mt-[41px] text-[18px] leading-[26px] text-white/90">
          Let us create a journey around you.
        </p>
        <div className="mt-[51px] flex flex-wrap gap-[14px]">
          <Link
            href={userRoutes.planCharter}
            className="inline-flex h-[54px] w-[241px] items-center justify-center gap-[20px] bg-white text-[12px] tracking-[0.18em] uppercase transition-opacity hover:opacity-90"
            style={{ color: INK }}
          >
            Plan your journey
            <ArrowRight className="size-[13px]" strokeWidth={1.5} aria-hidden="true" />
          </Link>
          <Link
            href={userRoutes.yachts}
            className="inline-flex h-[54px] w-[221px] items-center justify-center border border-white/50 text-[12px] tracking-[0.18em] uppercase transition-colors hover:bg-white/10"
          >
            Explore the yachts
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

/**
 * Yacht details screen, built from the Figma design (1728px frame).
 * Renders dummy data by default; pass the API response as `yacht` once it is ready.
 */
export default function YachtDetails({ yacht = dummyYachtDetails }: { yacht?: YachtDetailsData }) {
  return (
    <div className="bg-white antialiased" style={{ ...SANS, color: INK }}>
      <MarinaFonts />
      <MarinaHeader />
      <TitleBlock yacht={yacht} />
      <Hero yacht={yacht} />
      <Stats yacht={yacht} />
      <LifeAboard yacht={yacht} />
      <Gallery yacht={yacht} />
      <Collection yachts={yacht.relatedYachts} />
      <JourneyCta />
      <MarinaFooter />
    </div>
  );
}
