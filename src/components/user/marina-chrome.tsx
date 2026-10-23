import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

import logo from "@/components/assets/Frame 1.svg";
import { userRoutes } from "@/constants/routes";

/*
 * Shared chrome for the Figma-designed pages (yacht details, plan your charter):
 * colour tokens, fonts, logo, header and footer.
 */

export const NAVY = "#0b1a2e";
export const INK = "#0d1b2a"; // headings, primary text
export const SANS: CSSProperties = {
  fontFamily: "'Switzer', ui-sans-serif, system-ui, sans-serif",
};
export const SERIF: CSSProperties = { fontFamily: "'Instrument Serif', Georgia, serif" };

const exploreLinks = ["Our yachts", "Life on board", "Our story", "The journal", "Get in touch"];
const placeLinks = [
  "Kerala Backwaters",
  "Lakshadweep Islands",
  "The Malabar Coast",
  "The Maldives",
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
      src={logo}
      alt="Sithara Marina"
      preload={!light}
      className={`h-auto ${size === "lg" ? "w-[160px] lg:w-[219px]" : "w-[120px] lg:w-[161px]"} ${light ? "brightness-0 invert" : ""}`}
    />
  );
}

/** Site header from the Figma: menu, centred logo, "Book yachts" button. */
export function MarinaHeader() {
  return (
    <header className="relative mx-auto h-[96px] w-full max-w-[1728px] lg:h-[112px]">
      <button
        type="button"
        className="absolute top-[30px] left-5 flex items-center gap-[11px] text-[13px] leading-[20px] tracking-[0.15em] uppercase lg:left-[40px]"
        style={{ color: INK }}
      >
        <span aria-hidden="true" className="flex w-[20px] flex-col gap-[6px]">
          <span className="h-[1.5px] w-full" style={{ backgroundColor: INK }} />
          <span className="h-[1.5px] w-full" style={{ backgroundColor: INK }} />
        </span>
        Menu
      </button>

      <Link
        href={userRoutes.home}
        aria-label="Sithara Marina home"
        className="absolute top-[20px] left-1/2 -translate-x-1/2 lg:top-[27px]"
      >
        <Logo />
      </Link>

      <Link
        href={userRoutes.yachts}
        className="absolute top-[22px] right-5 hidden h-[53px] w-[187px] items-center justify-center gap-[18px] text-[12px] tracking-[0.18em] text-white uppercase transition-opacity hover:opacity-90 sm:flex lg:top-[28px] lg:right-[28px]"
        style={{ backgroundColor: NAVY }}
      >
        Book yachts
        <ArrowRight className="size-[13px]" strokeWidth={1.5} aria-hidden="true" />
      </Link>
    </header>
  );
}

/** Site footer from the Figma. */
export function MarinaFooter() {
  return (
    <footer
      className="mx-auto w-full max-w-[1728px] text-white"
      style={{ background: "linear-gradient(180deg, #061527 0%, #0a223d 55%, #0e2f52 100%)" }}
    >
      <div className="px-5 pt-[96px] lg:px-[100px] lg:pt-[129px]">
        <div className="flex justify-center">
          <Logo light size="lg" />
        </div>

        <div className="mt-[60px] flex flex-col items-center gap-14 text-center lg:flex-row lg:justify-center lg:gap-[90px]">
          <nav aria-label="Explore" className="order-2 w-[200px] lg:order-1">
            <p className="text-[13px] leading-[18px]">Explore Astra</p>
            <ul className="mt-[28px] space-y-[16.5px] text-[14px] leading-[20px] text-white/75">
              {exploreLinks.map((label) => (
                <li key={label}>
                  <a href="#" className="hover:text-white">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="order-1 flex w-full flex-col items-center lg:order-2 lg:w-[530px]">
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
              href={userRoutes.contact}
              className="mt-[52px] inline-flex h-[50px] w-[278px] items-center justify-center gap-[18px] text-[12px] tracking-[0.18em] uppercase transition-colors hover:bg-[#1d4470]"
              style={{ backgroundColor: "#15345a" }}
            >
              Speak to our concierge
              <ArrowRight className="size-[13px]" strokeWidth={1.5} aria-hidden="true" />
            </Link>
          </div>

          <nav aria-label="Destinations" className="order-3 w-[200px]">
            <p className="text-[13px] leading-[18px]">Find your place</p>
            <ul className="mt-[28px] space-y-[16.5px] text-[14px] leading-[20px] text-white/75">
              {placeLinks.map((label) => (
                <li key={label}>
                  <a href="#" className="hover:text-white">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-[96px] flex flex-wrap items-center justify-center gap-x-[35px] gap-y-3 text-[18px] leading-[24px] text-white/85 lg:mt-[126px]">
          <span>Kerala&nbsp;&nbsp;·&nbsp;&nbsp;India</span>
          <a href="tel:+919724553452" className="hover:text-white">
            +919724553452
          </a>
          <a href="mailto:sitharamarina@gmail.com" className="hover:text-white">
            sitharamarina@gmail.com
          </a>
        </div>
        <div className="mt-[46px] flex justify-center gap-[35px] text-[14px] leading-[20px] text-white/80">
          {["Instagram", "Youtube", "Press"].map((label) => (
            <a key={label} href="#" className="hover:text-white">
              {label}
            </a>
          ))}
        </div>

        <div className="mt-[60px] flex flex-col gap-3 border-t border-white/10 pt-[31px] pb-[30px] text-[13px] leading-[18px] text-white/75 sm:flex-row sm:justify-between">
          <p>© 2026 Sithara Marina. All rights reserved.</p>
          <div className="flex gap-[19px]">
            <Link href={userRoutes.privacy} className="hover:text-white">
              Privacy policy
            </Link>
            <Link href={userRoutes.terms} className="hover:text-white">
              Terms &amp; conditions
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
