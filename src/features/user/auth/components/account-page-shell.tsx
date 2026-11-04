import type { ReactNode } from "react";

import { MarinaFonts, MarinaFooter, SANS, SERIF } from "@/components/user/marina-chrome";
import { cx } from "@/lib/cx";

export interface AccountPageShellProps {
  /** Unique id for the page heading (labels the section). */
  headingId: string;
  /** Sans-serif part of the heading, e.g. "Welcome". */
  heading: string;
  /** Serif part that ends the heading, e.g. "back.". */
  headingSerif: string;
  subtitle: ReactNode;
  children: ReactNode;
  /** Optional right-hand column (e.g. the sign-in photo). */
  aside?: ReactNode;
}

/**
 * Shared body of the account pages (sign in, create account, forgot / reset password, verify email)
 * between the site header and the Figma footer: breadcrumb, mixed sans/serif
 * heading and subtitle. From `lg`, sizes are 1728px-reference pixels times
 * `--rw` (viewport width / 1728); small text keeps a readable minimum.
 */
export function AccountPageShell({
  headingId,
  heading,
  headingSerif,
  subtitle,
  children,
  aside,
}: AccountPageShellProps) {
  return (
    <div className="bg-white antialiased" style={SANS}>
      <MarinaFonts />

      <section
        aria-labelledby={headingId}
        className={cx(
          "border-t border-[#d9dcdf] px-5 pt-16 pb-24 text-[#0d1b2a] sm:px-10 lg:pt-[calc(var(--r)*105)] lg:pr-[calc(var(--rw)*101)] lg:pb-[calc(var(--r)*101)] lg:pl-[calc(var(--rw)*100)] lg:[--r:var(--rw)] lg:[--rw:calc(100vw/1728)]",
          Boolean(aside) &&
            "md:grid md:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)] md:gap-x-12 lg:grid-cols-[1fr_calc(var(--rw)*440)] lg:gap-x-0",
        )}
      >
        <div>
          <p className="text-[0.6875rem] leading-none tracking-[0.12em] text-[#3d434a] uppercase lg:text-[max(calc(var(--r)*11),10px)]">
            Sithara Marina / Account
          </p>
          <h1
            id={headingId}
            className="mt-8 text-[clamp(2.5rem,10vw,3.25rem)] leading-[1.05] font-normal tracking-[-0.03em] md:text-[4rem] lg:mt-[calc(var(--r)*56)] lg:text-[max(calc(var(--r)*72),3.25rem)] lg:leading-none"
          >
            {heading}{" "}
            <span className="tracking-[-0.01em]" style={SERIF}>
              {headingSerif}
            </span>
          </h1>
          <p className="mt-8 text-[1.0625rem] leading-snug text-[#3d434a] lg:mt-[calc(var(--r)*36)] lg:text-[max(calc(var(--r)*18),16px)]">
            {subtitle}
          </p>

          {children}
        </div>

        {aside}
      </section>

      <MarinaFooter />
    </div>
  );
}
