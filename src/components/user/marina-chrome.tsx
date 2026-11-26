import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import type { CSSProperties, ReactNode } from "react";

import { SectionLink } from "@/components/user/section-link";
import { userRoutes } from "@/constants/routes";

/*
 * Shared chrome for the Figma-designed pages (yacht details, plan your charter):
 * colour tokens, fonts, logo and footer. The header is the shared `SiteHeader`.
 */

export const NAVY = "#0b1a2e";
export const INK = "#0d1b2a"; // headings, primary text
export const SANS: CSSProperties = {
  fontFamily: "'Switzer', ui-sans-serif, system-ui, sans-serif",
};
export const SERIF: CSSProperties = { fontFamily: "'Instrument Serif', Georgia, serif" };

// Footer items link to a page, or to the home page section that covers them
// (by its heading's id). Items with neither render as plain text (same styling)
// until their destination is published: Life on board, and the destinations the
// home page does not show yet.
const exploreLinks: { label: string; href?: Route }[] = [
  { label: "Our yachts", href: userRoutes.yachts },
  { label: "Life on board" },
  { label: "Our story", href: userRoutes.homeSection("about-heading") },
  { label: "The journal", href: userRoutes.homeSection("journal-heading") },
  { label: "Get in touch", href: userRoutes.planCharter },
];
/** A footer link: home page sections scroll into place; anything else is a normal link. */
function FooterLink({ href, className, children }: { href: Route; className?: string; children: ReactNode }) {
  return href.startsWith("/#") ? (
    <SectionLink href={href} className={className}>
      {children}
    </SectionLink>
  ) : (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

/** The home page's "Places that stay with you" section. */
const DESTINATIONS_SECTION = userRoutes.homeSection("destinations-heading");
const placeLinks: { label: string; href?: Route }[] = [
  // The destination the home page's Destinations section features.
  { label: "Kerala Backwaters", href: DESTINATIONS_SECTION },
  { label: "Lakshadweep Islands" },
  { label: "The Malabar Coast" },
  { label: "The Maldives" },
];

/** Switzer (Fontshare) and Instrument Serif (Google Fonts). React 19 hoists these into <head>. */
export function MarinaFonts() {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://api.fontshare.com/v2/css?f[]=switzer@400,500,600&display=swap"
        precedence="default"
      />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap"
        precedence="default"
      />
    </>
  );
}

export function Logo({ light = false, size = "sm" }: { light?: boolean; size?: "sm" | "lg" }) {
  return (
    <Image
      src="/images/brand/sithara-marina-logo.svg"
      width={161}
      height={87}
      alt="Sithara Marina"
      preload={!light}
      className={`h-auto ${size === "lg" ? "w-[160px] lg:w-[219px]" : "w-[120px] lg:w-[161px]"} ${light ? "brightness-0 invert" : ""}`}
    />
  );
}

/** Site footer from the Figma. */
export function MarinaFooter() {
  return (
    <footer
      // Explicit: on the standalone pages this sits inside <main>, which drops the implicit role.
      role="contentinfo"
      // The gradient spans the full width; only the content keeps the 1728px Figma frame.
      // (Capping the footer itself left white bands beside it on screens wider than 1728px.)
      className="w-full text-white"
      style={{ background: "linear-gradient(180deg, #061527 0%, #0a223d 55%, #0e2f52 100%)" }}
    >
      <div className="mx-auto max-w-[1728px] px-5 pt-[96px] lg:px-[100px] lg:pt-[129px]">
        <div className="flex justify-center">
          <Logo light size="lg" />
        </div>

        <div className="mt-[60px] grid grid-cols-2 items-start gap-x-6 gap-y-14 text-center lg:flex lg:flex-row lg:items-center lg:justify-center lg:gap-[90px]">
          <nav aria-label="Explore" className="order-2 lg:order-1 lg:w-[200px]">
            <p className="text-[13px] leading-[18px]">
              <FooterLink href={userRoutes.homeSection("astra-way-heading")} className="hover:text-white/80">
                Explore Astra
              </FooterLink>
            </p>
            <ul className="mt-[28px] space-y-[16.5px] text-[14px] leading-[20px] text-white/75">
              {exploreLinks.map(({ label, href }) => (
                <li key={label}>
                  {href ? (
                    <FooterLink href={href} className="hover:text-white">
                      {label}
                    </FooterLink>
                  ) : (
                    label
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <div className="order-1 col-span-2 flex w-full flex-col items-center lg:order-2 lg:w-[530px]">
            <span className="h-[65px] w-px bg-[#1d4a7c]" aria-hidden="true" />
            <p
              className="mt-[23px] text-[52px] leading-[56px] italic lg:text-[58px] lg:leading-[63px]"
              style={SERIF}
            >
              See Kerala
              <br />
              differently.
            </p>
            <Link
              href={userRoutes.planCharter}
              className="mt-[52px] inline-flex h-[50px] w-[278px] items-center justify-center gap-[18px] text-[12px] tracking-[0.18em] uppercase transition-colors hover:bg-[#1d4470]"
              style={{ backgroundColor: "#15345a" }}
            >
              Speak to our concierge
              <ArrowRight className="size-[13px]" strokeWidth={1.5} aria-hidden="true" />
            </Link>
          </div>

          <nav aria-label="Destinations" className="order-3 lg:w-[200px]">
            <p className="text-[13px] leading-[18px]">
              <FooterLink href={DESTINATIONS_SECTION} className="hover:text-white/80">
                Find your place
              </FooterLink>
            </p>
            <ul className="mt-[28px] space-y-[16.5px] text-[14px] leading-[20px] text-white/75">
              {placeLinks.map(({ label, href }) => (
                <li key={label}>
                  {href ? (
                    <FooterLink href={href} className="hover:text-white">
                      {label}
                    </FooterLink>
                  ) : (
                    label
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-[72px] flex flex-wrap items-center justify-center gap-x-[35px] gap-y-3 text-[16px] leading-[24px] text-white/85 sm:text-[18px] lg:mt-[126px]">
          <span>Kerala&nbsp;&nbsp;·&nbsp;&nbsp;India</span>
          <a href="tel:+919724553452" className="hover:text-white">
            +919724553452
          </a>
          <a href="mailto:sitharamarina@gmail.com" className="hover:text-white">
            sitharamarina@gmail.com
          </a>
        </div>
        <div className="mt-[46px] flex justify-center gap-[35px] text-[14px] leading-[20px] text-white/80">
          {/* Plain text until the social and press URLs are provided. */}
          {["Instagram", "Youtube", "Press"].map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>

        <div className="mt-[60px] flex flex-col gap-3 border-t border-white/10 pt-[31px] pb-[30px] text-[13px] leading-[18px] text-white/75 sm:flex-row sm:justify-between">
          <p>© 2026 Sithara Marina. All rights reserved.</p>
          {/* Terms stay plain text until that page is published. */}
          <div className="flex gap-[19px]">
            <Link href={userRoutes.privacy} className="hover:text-white">
              Privacy policy
            </Link>
            <span>Terms &amp; conditions</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
