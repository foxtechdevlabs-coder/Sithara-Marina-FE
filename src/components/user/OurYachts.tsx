/* eslint-disable @next/next/no-img-element -- yacht photos come from the API and their host is not configured */
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { INK, MarinaFonts, MarinaFooter, SANS } from "@/components/user/marina-chrome";
import { userRoutes } from "@/constants/routes";
import type { FleetYacht } from "@/features/user/yachts/utils/yacht-view";

/* ------------------------------------------------------------------ */
/* Figma colours                                                       */
/* ------------------------------------------------------------------ */

const BODY = "#4a4f55"; // paragraph text
const MUTED = "#7a7f85"; // breadcrumb
const META = "#555a60"; // metres / guests / suites
const AREA = "#8a8f94"; // small cruising-area label

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
  const href = userRoutes.yacht(yacht.slug);
  return (
    <article>
      <Link href={href} className="group relative block overflow-hidden" aria-label={yacht.name}>
        {yacht.image ? (
          <img
            src={yacht.image.src}
            alt={yacht.image.alt}
            loading="lazy"
            className="aspect-[642/394] w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <span aria-hidden="true" className="block aspect-[642/394] w-full bg-[#e5e7eb]" />
        )}
        {yacht.location && (
          <span
            className="absolute top-[17px] left-[17px] flex h-[26px] items-center bg-white/95 px-[10px] text-[12px] tracking-[0.1em] uppercase"
            style={{ color: INK }}
          >
            {yacht.location}
          </span>
        )}
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
        {yacht.area && (
          <span className="text-[9px] tracking-[0.15em] uppercase" style={{ color: AREA }}>
            {yacht.area}
          </span>
        )}
      </div>

      <p
        className="mt-[6px] flex flex-wrap items-center gap-[12px] text-[14px] leading-[20px]"
        style={{ color: META }}
      >
        {yacht.specs.map((m, i) => (
          <span key={m} className="flex items-center gap-[12px]">
            {i > 0 && <span aria-hidden="true" className="h-[10px] w-px bg-[#c4c7cb]" />}
            {m}
          </span>
        ))}
      </p>

      {yacht.availabilityNote && (
        <p className="mt-[6px] text-[14px] leading-[20px]" style={{ color: META }}>
          {yacht.availabilityNote}
        </p>
      )}

      {yacht.description && (
        <p className="mt-[13px] max-w-[495px] text-[16px] leading-[25px]" style={{ color: BODY }}>
          {yacht.description}
        </p>
      )}

      <p className="mt-[13px] text-[16px] leading-[25px]" style={{ color: INK }}>
        {yacht.startingPrice ?? "Price on request"}
        {yacht.startingPrice && (
          <span className="ml-[10px] text-[14px]" style={{ color: META }}>
            Starting from · excl. GST
          </span>
        )}
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
 */
/** The result count, and what was searched for when the list is filtered. */
export interface ResultsSummary {
  shown: number;
  total: number;
  filtered: boolean;
  /** The applied filters in words. */
  selected: string[];
  /** The search holds a preference the API cannot filter by. */
  unsupportedSelected: boolean;
  editHref: Route;
}

/** Previous/Next links; a null href means there is no such page. */
export interface ListPagination {
  page: number;
  totalPages: number;
  previousHref: Route | null;
  nextHref: Route | null;
}

function PageLink({ href, children }: { href: Route | null; children: ReactNode }) {
  const style = "text-[12px] tracking-[0.18em] uppercase";
  if (!href) {
    return (
      <span aria-disabled="true" className={`${style} opacity-40`}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={`${style} border-b pb-1`} style={{ borderColor: INK }}>
      {children}
    </Link>
  );
}

export default function OurYachts({
  yachts,
  summary,
  pagination,
  failure,
  editHref,
}: {
  yachts: FleetYacht[];
  summary?: ResultsSummary;
  pagination?: ListPagination;
  failure?: "invalid-filter" | "unavailable";
  /** Back to the search, keeping its selections. */
  editHref?: Route;
}) {
  return (
    <div className="bg-white antialiased" style={{ ...SANS, color: INK }}>
      <MarinaFonts />

      <section className="mx-auto w-full max-w-[1728px] px-5 pt-[37px] pb-[140px] lg:px-[clamp(40px,11.8vw,204px)] lg:pb-[211px]">
        <Intro />

        {summary && (
          <div className="mt-[56px] flex flex-wrap items-center justify-between gap-4 border-y border-[#e5e7eb] py-[18px] lg:mt-[80px]">
            <div className="min-w-0">
              <p className="text-[14px]" style={{ color: BODY }}>
                Showing {summary.shown} of {summary.total}{" "}
                {summary.total === 1 ? "yacht" : "yachts"}
                {summary.filtered ? " for your search" : ""}.
              </p>
              {summary.selected.length > 0 && (
                <p className="mt-[4px] text-[14px]" style={{ color: INK }}>
                  {summary.selected.join(" · ")}
                </p>
              )}
              {summary.unsupportedSelected && (
                <p className="mt-[4px] text-[12px]" style={{ color: MUTED }}>
                  Duration and On board preferences don’t narrow these results yet.
                </p>
              )}
            </div>
            {summary.filtered && (
              <div className="flex gap-[24px] text-[12px] tracking-[0.18em] uppercase">
                <Link
                  href={summary.editHref}
                  className="border-b pb-1"
                  style={{ borderColor: INK }}
                >
                  Edit filters
                </Link>
                <Link
                  href={userRoutes.yachts}
                  className="border-b border-transparent pb-1 hover:border-current"
                  style={{ color: MUTED }}
                >
                  Clear
                </Link>
              </div>
            )}
          </div>
        )}

        {failure === "invalid-filter" && (
          <p
            role="alert"
            className="mt-[56px] max-w-[520px] text-[16px] leading-[27px]"
            style={{ color: BODY }}
          >
            We couldn’t search with those filters. The date may be in the past or too far ahead, or
            the price range may be reversed.{" "}
            {editHref && (
              <>
                <Link href={editHref} className="underline underline-offset-2">
                  Edit your filters
                </Link>{" "}
                or{" "}
              </>
            )}
            <Link href={userRoutes.yachts} className="underline underline-offset-2">
              see all yachts
            </Link>
            .
          </p>
        )}

        {failure === "unavailable" && (
          <p
            role="alert"
            className="mt-[56px] max-w-[520px] text-[16px] leading-[27px]"
            style={{ color: BODY }}
          >
            We couldn’t load our yachts just now. Please refresh the page in a moment, or{" "}
            <Link href={userRoutes.planCharter} className="underline underline-offset-2">
              ask our concierge
            </Link>
            .
          </p>
        )}

        {!failure && yachts.length === 0 && (
          <p className="mt-[56px] max-w-[520px] text-[16px] leading-[27px]" style={{ color: BODY }}>
            {summary?.filtered
              ? "No yachts match every filter yet. Try fewer options, or "
              : "No yachts are listed just now. Please "}
            <Link href={userRoutes.planCharter} className="underline underline-offset-2">
              ask our concierge
            </Link>{" "}
            to find one for you.
          </p>
        )}

        <div
          className={`grid gap-x-[36px] gap-y-[56px] md:grid-cols-2 lg:gap-y-[45px] ${
            summary ? "mt-[48px] lg:mt-[64px]" : "mt-[80px] lg:mt-[127px]"
          }`}
        >
          {yachts.map((yacht) => (
            <YachtCard key={yacht.slug} yacht={yacht} />
          ))}
        </div>

        {pagination && (
          <nav
            aria-label="Yacht pages"
            className="mt-[56px] flex flex-wrap items-center justify-between gap-4 border-t border-[#e5e7eb] pt-[18px]"
          >
            <PageLink href={pagination.previousHref}>Previous</PageLink>
            <p className="text-[14px]" style={{ color: BODY }}>
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <PageLink href={pagination.nextHref}>Next</PageLink>
          </nav>
        )}
      </section>

      <MarinaFooter />
    </div>
  );
}
