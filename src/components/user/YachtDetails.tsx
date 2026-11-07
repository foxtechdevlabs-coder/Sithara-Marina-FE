/* eslint-disable @next/next/no-img-element -- yacht photos come from the API and their host is not configured */
import { ArrowRight, Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { INK, MarinaFonts, MarinaFooter, SANS, SERIF } from "@/components/user/marina-chrome";
import { userRoutes } from "@/constants/routes";
import { YachtReservation } from "@/features/user/availability/components/yacht-reservation";
import type { FleetYacht, YachtDetailsData } from "@/features/user/yachts/utils/yacht-view";

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

function UnderlineLink({ children, href }: { children: ReactNode; href: string }) {
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
          {yacht.intro && (
            <p className="max-w-[390px] text-[14px] leading-[27px]" style={{ color: "#6b7068" }}>
              {yacht.intro}
            </p>
          )}
          <div className="mt-[23px] flex flex-wrap items-center gap-x-[28px] gap-y-[16px]">
            <UnderlineLink href="#reserve">Check availability</UnderlineLink>
            {yacht.enquiryEnabled && (
              <a
                href={userRoutes.planCharterFor(yacht.slug)}
                className="border-b border-[#b5b8bc] pb-[7px] text-[12px] leading-[16px] tracking-[0.18em] uppercase"
                style={{ color: MUTED }}
              >
                Request a custom quote
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Hero({ yacht }: { yacht: YachtDetailsData }) {
  return (
    <section className="relative mx-auto w-full max-w-[1728px]">
      {yacht.heroImage ? (
        <img
          src={yacht.heroImage.src}
          alt={yacht.heroImage.alt}
          className="h-[300px] w-full object-cover md:h-[440px] lg:h-[579px]"
        />
      ) : (
        <div
          aria-hidden="true"
          className="h-[300px] w-full md:h-[440px] lg:h-[579px]"
          style={{ backgroundColor: CARD }}
        />
      )}
      {yacht.region && (
        <span
          className="absolute top-[24px] left-5 flex h-[35px] items-center bg-white px-[20px] text-[14px] lg:top-[34px] lg:left-[100px]"
          style={{ color: INK }}
        >
          {yacht.region}
        </span>
      )}
    </section>
  );
}

function Stats({ yacht }: { yacht: YachtDetailsData }) {
  return (
    <section className="mx-auto w-full max-w-[1728px] px-5 pt-[45px] lg:pr-[3.36%] lg:pl-[4.05%]">
      <ul className="grid grid-cols-2 gap-y-10 border-b border-[#e5e7eb] pb-[45px] sm:grid-cols-4">
        {yacht.stats.map((stat, i) => (
          <li
            key={stat.label}
            className={`relative flex flex-col items-center justify-center gap-2 text-center lg:flex-row lg:gap-[17px] lg:text-left ${
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
            <span
              className="max-w-[110px] text-[14px] leading-[17px] lg:max-w-[90px]"
              style={{ color: "#555a60" }}
            >
              {stat.label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CheckList({ items, wide = false }: { items: string[]; wide?: boolean }) {
  return (
    <ul
      className={`mt-[20px] grid gap-x-[32px] gap-y-[14.5px] ${
        wide ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-[minmax(0,405px)_minmax(0,1fr)]"
      }`}
    >
      {items.map((item) => (
        <li
          key={item}
          className="flex items-center gap-[13px] text-[16px] leading-[24px]"
          style={{ color: BODY }}
        >
          <Check
            className="size-[13px] shrink-0"
            strokeWidth={1.5}
            style={{ color: BODY }}
            aria-hidden="true"
          />
          {item}
        </li>
      ))}
    </ul>
  );
}

function LifeAboard({ yacht }: { yacht: YachtDetailsData }) {
  return (
    <section>
      <div className="pt-[2px]">
        <Eyebrow>Life aboard {yacht.name}</Eyebrow>
      </div>
      <h2
        className="mt-[22px] max-w-[360px] text-[40px] leading-[44px] tracking-[-1.5px] lg:text-[56px] lg:leading-[58px]"
        style={{ ...SANS, color: INK }}
      >
        A little further from everyday.
      </h2>
      {yacht.about && (
        <p
          className="mt-[25px] max-w-[790px] text-[16px] leading-[27px] break-words"
          style={{ color: BODY }}
        >
          {yacht.about}
        </p>
      )}

      {yacht.features.length > 0 && (
        <>
          <h3
            className="mt-[56px] text-[28px] leading-[40px] tracking-[-0.5px] lg:text-[32px]"
            style={{ ...SANS, color: INK }}
          >
            Every detail, considered.
          </h3>
          <CheckList items={yacht.features} wide />
        </>
      )}
    </section>
  );
}

function DetailHeading({ children }: { children: ReactNode }) {
  return (
    <h2
      className="text-[28px] leading-[40px] tracking-[-0.5px] lg:text-[32px]"
      style={{ ...SANS, color: INK }}
    >
      {children}
    </h2>
  );
}

/** Charter details, crew, inclusions, departure points and policies; each only when it has data. */
function CharterFacts({ yacht }: { yacht: YachtDetailsData }) {
  const { charterDetails, inclusions, departurePoints, crew, policies } = yacht;

  return (
    <section
      className={`${FRAME} grid gap-12 pt-[80px] pb-[48px] lg:grid-cols-2 lg:gap-x-[80px] lg:pb-[64px]`}
    >
      <div>
        <DetailHeading>Charter details.</DetailHeading>
        <dl className="mt-[20px] max-w-[560px] text-[15px] leading-[20px]">
          {charterDetails.map((row) => (
            <div
              key={row.label}
              className="flex min-h-[44px] items-center justify-between gap-x-6 border-t border-[#e5e7eb] py-[8px]"
            >
              <dt style={{ color: MUTED }}>{row.label}</dt>
              <dd className="text-right" style={{ color: INK }}>
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
      {inclusions.length > 0 && (
        <div>
          <DetailHeading>What’s included.</DetailHeading>
          <CheckList items={inclusions} />
        </div>
      )}
      {departurePoints.length > 0 && (
        <div>
          <DetailHeading>Where you’ll board.</DetailHeading>
          <CheckList items={departurePoints} />
        </div>
      )}
      {crew.length > 0 && (
        <div>
          <DetailHeading>Your crew.</DetailHeading>
          <ul className="mt-[20px] grid gap-y-[20px]">
            {crew.map((member) => (
              <li key={`${member.name}-${member.role}`}>
                <p className="text-[16px] leading-[24px]" style={{ color: INK }}>
                  {member.name}
                </p>
                <p className="text-[14px] leading-[20px]" style={{ color: MUTED }}>
                  {member.role}
                </p>
                {member.bio && (
                  <p
                    className="mt-[6px] max-w-[560px] text-[16px] leading-[25px]"
                    style={{ color: BODY }}
                  >
                    {member.bio}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {policies && (
        <div>
          <DetailHeading>Good to know.</DetailHeading>
          <p
            className="mt-[20px] max-w-[790px] text-[16px] leading-[27px] whitespace-pre-line"
            style={{ color: BODY }}
          >
            {policies}
          </p>
        </div>
      )}
    </section>
  );
}

function Gallery({ yacht }: { yacht: YachtDetailsData }) {
  if (yacht.gallery.length === 0) return null;

  return (
    <section>
      <h2
        className="text-[28px] leading-[40px] tracking-[-0.5px] lg:text-[32px]"
        style={{ ...SANS, color: INK }}
      >
        Life on board.
      </h2>
      <div className="mt-[24px] grid grid-cols-2 gap-[12px] md:grid-cols-3 lg:gap-[17px]">
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

function Collection({ yachts }: { yachts: FleetYacht[] }) {
  if (yachts.length === 0) return null;

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
          <article key={item.slug}>
            <div className="relative overflow-hidden">
              {item.image ? (
                <img
                  src={item.image.src}
                  alt={item.image.alt}
                  loading="lazy"
                  className="aspect-[488/297] w-full object-cover transition-transform duration-700 hover:scale-105"
                />
              ) : (
                <div aria-hidden="true" className="aspect-[488/297] w-full bg-[#e5e7eb]" />
              )}
              {item.location && (
                <span
                  className="absolute top-[17px] left-[17px] flex h-[30px] items-center bg-white/95 px-[10px] text-[14px]"
                  style={{ color: INK }}
                >
                  {item.location}
                </span>
              )}
            </div>
            <h3
              className="mt-[18px] text-[36px] leading-[44px] tracking-[-0.5px]"
              style={{ ...SANS, color: INK }}
            >
              {item.name}
            </h3>
            <p
              className="mt-[7px] flex flex-wrap items-center gap-[14px] text-[14px] leading-[20px]"
              style={{ color: "#555a60" }}
            >
              {item.specs.map((m, i) => (
                <span key={m} className="flex items-center gap-[14px]">
                  {i > 0 && <span aria-hidden="true" className="h-[10px] w-px bg-[#c4c7cb]" />}
                  {m}
                </span>
              ))}
            </p>
            {item.description && (
              <p
                className="mt-[12px] max-w-[400px] text-[16px] leading-[25px]"
                style={{ color: BODY }}
              >
                {item.description}
              </p>
            )}
            <div className="mt-[27px]">
              <UnderlineLink href={userRoutes.yacht(item.slug)}>Discover {item.name}</UnderlineLink>
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
        src="/images/yachts/kerala-journey-houseboat.png"
        unoptimized
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
 */
export default function YachtDetails({
  yacht,
  initialMonth,
}: {
  yacht: YachtDetailsData;
  /** YYYY-MM. */
  initialMonth: string;
}) {
  return (
    <div className="bg-white antialiased" style={{ ...SANS, color: INK }}>
      <MarinaFonts />
      <TitleBlock yacht={yacht} />
      <Hero yacht={yacht} />
      <Stats yacht={yacht} />
      <div className={`${FRAME} pt-[80px] lg:pt-[97px]`}>
        <YachtReservation
          yachtId={yacht.id}
          slug={yacht.slug}
          name={yacht.name}
          capacity={yacht.capacity}
          suites={yacht.suites}
          slotTypes={yacht.slotTypes}
          enquiryEnabled={yacht.enquiryEnabled}
          bookingMode={yacht.bookingMode}
          startingPrice={yacht.startingPrice}
          departureCity={yacht.departureCity}
          initialMonth={initialMonth}
          intro={<LifeAboard yacht={yacht} />}
          after={yacht.gallery.length > 0 ? <Gallery yacht={yacht} /> : undefined}
        />
      </div>
      <CharterFacts yacht={yacht} />
      <Collection yachts={yacht.relatedYachts} />
      <JourneyCta />
      <MarinaFooter />
    </div>
  );
}
