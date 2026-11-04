import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";

/* Figma typography and colours for the admin sign-in screens. */
export const AUTH_SANS: CSSProperties = {
  fontFamily: "'Switzer', ui-sans-serif, system-ui, sans-serif",
};
export const AUTH_SERIF: CSSProperties = { fontFamily: "'Instrument Serif', Georgia, serif" };
export const AUTH_INK = "#0d1b2a";
export const AUTH_BODY = "#4a4f55";
export const AUTH_MUTED = "#5f646a";
export const AUTH_BORDER = "#c9ccd0";
export const AUTH_NOTE_BG = "#f5f0e9";
export const AUTH_GRADIENT = "linear-gradient(90deg, #f4f8fd 0%, #cfe2f8 40%, #5aa6ef 100%)";

export const authField =
  "h-[58px] w-full border bg-white px-[16px] text-[16px] text-[#0d1b2a] outline-none transition-colors placeholder:text-[#9a9da1] focus:border-[#0d1b2a]";

export const authPrimaryButton =
  "inline-flex h-[56px] w-full items-center justify-center gap-[6px] text-[12px] transition-opacity hover:opacity-90 disabled:opacity-70 sm:w-[176px]";

export function AuthLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-[12px] leading-[16px]"
      style={{ color: AUTH_BODY }}
    >
      {children}
      <span aria-hidden="true"> *</span>
    </label>
  );
}

/** Red, announced message for a failed request. */
export function AuthError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mt-[20px] max-w-[560px] text-[13px] leading-[20px] text-[#b3261e]">
      {children}
    </p>
  );
}

/**
 * Two-panel frame shared by the admin sign-in screens (from the Figma
 * design): photo panel with the headline on the left, form panel on the right.
 */
export function AdminAuthLayout({
  eyebrow,
  title,
  titleAccent,
  intro,
  children,
}: {
  eyebrow: string;
  /** Sans part of the heading, e.g. "Welcome". */
  title: string;
  /** Serif part of the heading, e.g. "back.". */
  titleAccent: string;
  intro: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className="grid min-h-dvh bg-white antialiased lg:grid-cols-[minmax(0,832fr)_minmax(0,1004fr)]"
      style={{ ...AUTH_SANS, color: AUTH_INK }}
    >
      {/* Switzer (Fontshare) and Instrument Serif (Google Fonts). React 19 hoists these into <head>. */}
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

      {/* Photo panel */}
      <section className="relative isolate flex min-h-[26rem] flex-col justify-between overflow-hidden px-6 pt-10 pb-12 text-white sm:px-[80px] lg:min-h-dvh lg:pt-[80px] lg:pb-[188px]">
        <Image
          src="/images/adminimgs/Original Astra One photography.png"
          alt=""
          fill
          preload
          unoptimized
          sizes="(min-width: 1024px) 45vw, 100vw"
          className="-z-20 object-cover object-[70%_50%]"
        />
        {/* Navy wash: light over the sky, deep behind the headline. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{
            background:
              "linear-gradient(180deg, rgba(10,30,52,0.30) 0%, rgba(10,30,52,0.38) 35%, rgba(9,27,48,0.72) 62%, rgba(8,24,44,0.94) 100%)",
          }}
        />

        <div className="w-fit">
          <Image
            src="/images/brand/sithara-marina-logo.svg"
            alt="Sithara Marina"
            width={161}
            height={87}
            unoptimized
            className="h-auto w-[150px] brightness-0 invert lg:w-[181px]"
          />
        </div>

        <div className="mt-16 lg:mt-0">
          <h1 className="text-[40px] leading-[1.08] tracking-[-1.2px] sm:text-[48px] lg:text-[59px] lg:leading-[60px] lg:tracking-[-1.7px]">
            Every journey,
            <br />
            thoughtfully{" "}
            <span className="tracking-[-0.5px]" style={AUTH_SERIF}>
              managed.
            </span>
          </h1>
          <p className="mt-[28px] max-w-[620px] text-[16px] leading-[27px] text-white/90 lg:mt-[68px] lg:text-[18px]">
            A clear view of bookings, conversations and the details that make time on the water feel
            effortless.
          </p>
        </div>
      </section>

      {/* Form panel */}
      <main id="main" className="px-6 pt-12 pb-16 sm:px-[100px] lg:pt-[101px]">
        <p
          className="text-[12px] leading-[16px] tracking-[0.1em] uppercase"
          style={{ color: AUTH_MUTED }}
        >
          {eyebrow}
        </p>
        <h2
          className="mt-[28px] text-[48px] leading-[1.1] font-normal tracking-[-1.5px] lg:mt-[26px] lg:text-[57px] lg:tracking-[-1.8px]"
          style={AUTH_SANS}
        >
          {title}{" "}
          <span className="tracking-[-1px]" style={AUTH_SERIF}>
            {titleAccent}
          </span>
        </h2>
        <div
          className="mt-[24px] text-[16px] leading-[24px] lg:mt-[30px]"
          style={{ color: AUTH_BODY }}
        >
          {intro}
        </div>
        {children}
      </main>
    </div>
  );
}
