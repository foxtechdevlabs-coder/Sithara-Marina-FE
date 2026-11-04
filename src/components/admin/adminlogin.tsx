"use client";

import { ArrowRight } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type CSSProperties, type ReactNode, type SubmitEvent } from "react";

import { adminRoutes } from "@/constants/routes";
import { cx } from "@/lib/cx";

/* Figma typography and colours (kept local: admin code must not import user-area modules). */
const SANS: CSSProperties = { fontFamily: "'Switzer', ui-sans-serif, system-ui, sans-serif" };
const SERIF: CSSProperties = { fontFamily: "'Instrument Serif', Georgia, serif" };
const INK = "#0d1b2a";
const BODY = "#4a4f55";
const MUTED = "#5f646a";
const BORDER = "#c9ccd0";
const NOTE_BG = "#f5f0e9";
const GRADIENT = "linear-gradient(90deg, #f4f8fd 0%, #cfe2f8 40%, #5aa6ef 100%)";

const field =
  "h-[58px] w-full border bg-white px-[16px] text-[16px] text-[#0d1b2a] outline-none transition-colors placeholder:text-[#9a9da1] focus:border-[#0d1b2a]";

function Label({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-[12px] leading-[16px]" style={{ color: BODY }}>
      {children}
      <span aria-hidden="true"> *</span>
    </label>
  );
}

/**
 * Staff sign-in screen ("Welcome back."), built from the Figma design: photo
 * panel on the left, form on the right.
 *
 * UI ONLY: there is no auth API yet, so any email and password sign in and go
 * straight to the dashboard. Replace `handleSubmit` with the real call (and
 * add the session check in `app/admin/(console)/layout.tsx`) once it exists.
 */
export default function AdminLogin() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    // The browser's required/email checks have already passed at this point.
    setSubmitting(true);
    // TODO: POST the credentials to the auth API, then redirect on success.
    router.push(adminRoutes.dashboard);
  }

  return (
    <div
      className="grid min-h-dvh bg-white antialiased lg:grid-cols-[minmax(0,832fr)_minmax(0,1004fr)]"
      style={{ ...SANS, color: INK }}
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
            <span className="tracking-[-0.5px]" style={SERIF}>
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
          style={{ color: MUTED }}
        >
          Sithara Marina / Super admin
        </p>
        <h2
          className="mt-[28px] text-[48px] leading-[1.1] font-normal tracking-[-1.5px] lg:mt-[26px] lg:text-[57px] lg:tracking-[-1.8px]"
          style={SANS}
        >
          Welcome{" "}
          <span className="tracking-[-1px]" style={SERIF}>
            back.
          </span>
        </h2>
        <p className="mt-[24px] text-[16px] leading-[24px] lg:mt-[30px]" style={{ color: BODY }}>
          Sign in to manage your charters and team.
        </p>

        <form
          onSubmit={handleSubmit}
          aria-label="Staff sign-in"
          className="mt-[28px] max-w-[560px] lg:mt-[30px]"
        >
          <Label htmlFor="email">Work email</Label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="username"
            placeholder="you@example.com"
            className={cx(field, "mt-[10px]")}
            style={{ borderColor: BORDER }}
          />

          <div className="mt-[40px] lg:mt-[62px]">
            <Label htmlFor="password">Password</Label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Your password"
              className={cx(field, "mt-[10px]")}
              style={{ borderColor: BORDER }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-[40px] inline-flex h-[56px] w-full items-center justify-center gap-[6px] text-[12px] transition-opacity hover:opacity-90 disabled:opacity-70 sm:w-[176px] lg:mt-[54px]"
            style={{ background: GRADIENT }}
          >
            {submitting ? "Signing in…" : "Sign in securely"}
            {!submitting && <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-3" />}
          </button>

          <div className="mt-[20px] w-full sm:w-[196px] lg:mt-[44px]">
            <button
              type="button"
              aria-expanded={showHelp}
              onClick={() => setShowHelp((s) => !s)}
              className="w-full py-1 text-center text-[12px] hover:underline"
            >
              Forgot your password?
            </button>
          </div>
          {showHelp && (
            <p
              role="status"
              className="mt-2 max-w-[560px] text-[13px] leading-[20px]"
              style={{ color: BODY }}
            >
              Ask a super admin to reset it for you. Self-service reset arrives with the staff
              accounts API.
            </p>
          )}
        </form>

        <aside
          className="mt-[32px] max-w-[696px] px-[20px] py-[20px] lg:mt-[44px] lg:py-[19px]"
          style={{ backgroundColor: NOTE_BG }}
        >
          <p
            className="text-[12px] leading-[16px] tracking-[0.1em] uppercase"
            style={{ color: MUTED }}
          >
            Authorised team access
          </p>
          <p className="mt-[12px] text-[14px] leading-[20px]">
            Keep your credentials private. Staff access follows the permissions assigned to your
            account.
          </p>
        </aside>
      </main>
    </div>
  );
}
