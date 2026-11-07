"use client";

/* eslint-disable @next/next/no-img-element -- yacht photos come from the API and their host is not configured */
import { ArrowRight, Mail, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode, type SubmitEvent } from "react";

import { INK, MarinaFonts, MarinaFooter, NAVY, SANS, SERIF } from "@/components/user/marina-chrome";
import { userRoutes } from "@/constants/routes";
import { cx } from "@/lib/cx";

/* ------------------------------------------------------------------ */
/* Colours and contact details                                         */
/* ------------------------------------------------------------------ */

const BODY = "#4a4f55"; // paragraph text
const MUTED = "#7a7f85"; // hints, step numbers
const BORDER = "#c9ccd0"; // field and chip borders
const PANEL = "#f4f7fb"; // concierge panel

const CONCIERGE_PHONE = "+91 97245 53452";
const CONCIERGE_PHONE_HREF = "tel:+919724553452";
const CONCIERGE_EMAIL = "sitharamarina@gmail.com";

/* ------------------------------------------------------------------ */
/* Form options. Yachts come from the API; these are enquiry wishes.    */
/* ------------------------------------------------------------------ */

const HELP_ME_CHOOSE = "Help me choose";
const destinations = [
  "Kerala Backwaters",
  "Lakshadweep Islands",
  "The Malabar Coast",
  "The Maldives",
  "Surprise me",
];
const occasions = ["Honeymoon", "Anniversary", "Birthday", "Family holiday", "Wedding", "Corporate"];
const durations = ["A day", "2 days", "3–5 days", "A week or more"];
const luxuries = [
  "Private chef tasting menu",
  "Scuba & snorkelling",
  "Photographer",
  "Celebration décor",
  "Airport transfers",
  "Ayurvedic spa",
];
const budgets = ["Under ₹ 10 lakh", "₹ 10–25 lakh", "₹ 25 lakh +", "Not sure yet"];
const contactMethods = ["Email", "Phone call", "WhatsApp"];
const steps = ["Share your wishes here", "We send a tailored proposal", "Refine it together, then confirm"];

/** What the enquiry says. There is no enquiry API yet: see `enquiryMailto`. */
export interface CharterEnquiry {
  fullName: string;
  email: string;
  phone?: string;
  yacht: string;
  destinations: string[];
  occasion?: string;
  start?: string;
  end?: string;
  flexibleDates: boolean;
  duration?: string;
  adults: number;
  children: number;
  luxuries: string[];
  budget?: string;
  message?: string;
  contactMethod: string;
}

/** A pre-filled email to the concierge, because the backend has no enquiry endpoint. */
function enquiryMailto(enquiry: CharterEnquiry): string {
  const lines = [
    ["Name", enquiry.fullName],
    ["Email", enquiry.email],
    ["Phone", enquiry.phone],
    ["Best way to reach me", enquiry.contactMethod],
    ["Yacht", enquiry.yacht],
    ["Destinations", enquiry.destinations.join(", ")],
    ["Occasion", enquiry.occasion],
    ["Preferred start", enquiry.start],
    ["Preferred end", enquiry.end],
    ["Dates are flexible", enquiry.flexibleDates ? "Yes" : "No"],
    ["Time aboard", enquiry.duration],
    ["Guests", `${enquiry.adults} adults, ${enquiry.children} children`],
    ["Little luxuries", enquiry.luxuries.join(", ")],
    ["Indicative budget", enquiry.budget],
    ["About the journey", enquiry.message],
  ].filter(([, value]) => value);
  const subject = `Charter enquiry from ${enquiry.fullName}`;
  const body = lines.map(([label, value]) => `${label}: ${value}`).join("\n");
  return `mailto:${CONCIERGE_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/* ------------------------------------------------------------------ */
/* Form building blocks                                                */
/* ------------------------------------------------------------------ */

const fieldClass =
  "h-[58px] w-full border bg-white px-[16px] text-[16px] text-[#0d1b2a] outline-none placeholder:text-[#9a9da1] focus:border-[#0d1b2a]";
const labelClass = "block text-[14px] leading-[20px] text-[#3d434a]";

function SectionHeading({ number, children }: { number: string; children: ReactNode }) {
  return (
    <h2 className="flex items-baseline gap-[14px]">
      <span className="text-[14px]" style={{ color: MUTED }}>
        {number}
      </span>
      <span
        className="text-[32px] leading-[40px] tracking-[-1px] lg:text-[36px] lg:leading-[44px]"
        style={{ ...SANS, color: INK }}
      >
        {children}
      </span>
    </h2>
  );
}

/** A labelled row of selectable buttons, for one choice or for several. */
function Chips({
  label,
  hint,
  options,
  selected,
  onToggle,
}: {
  label: string;
  hint?: string;
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
}) {
  return (
    <div role="group" aria-label={label} className="mt-[24px]">
      <p className={labelClass}>
        {label}
        {hint && <span style={{ color: MUTED }}> {hint}</span>}
      </p>
      <div className="mt-[10px] flex flex-wrap gap-[12px]">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => onToggle(option)}
              className={cx(
                "min-h-[52px] border px-[20px] py-[10px] text-[15px] leading-[20px] transition-colors",
                active ? "border-[#0d1b2a] bg-[#0d1b2a] text-white" : "bg-white hover:border-[#0d1b2a]",
              )}
              style={active ? undefined : { borderColor: BORDER, color: INK }}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Counter({
  label,
  hint,
  value,
  min,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  onChange: (value: number) => void;
}) {
  const stepClass =
    "flex size-[52px] shrink-0 items-center justify-center border bg-white text-[20px] disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div className="flex items-center gap-[24px]">
      <div>
        <p className="text-[15px] leading-[20px]">{label}</p>
        <p className="text-[13px] leading-[18px]" style={{ color: MUTED }}>
          {hint}
        </p>
      </div>
      <div className="flex items-center gap-[20px]">
        <button
          type="button"
          aria-label={`Fewer ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          className={stepClass}
          style={{ borderColor: BORDER }}
        >
          −
        </button>
        <span aria-live="polite" className="min-w-[24px] text-center text-[20px]">
          {value}
        </span>
        <button
          type="button"
          aria-label={`More ${label.toLowerCase()}`}
          onClick={() => onChange(value + 1)}
          className={stepClass}
          style={{ borderColor: BORDER }}
        >
          +
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export interface PlanCharterYacht {
  slug: string;
  name: string;
  imageUrl: string | null;
  /** Reservable online, so the availability card can offer it. */
  instant: boolean;
}

function Hero({ yacht }: { yacht: PlanCharterYacht | null }) {
  return (
    <section className="mx-auto grid w-full max-w-[1728px] lg:grid-cols-[minmax(0,535fr)_minmax(0,465fr)]">
      <div className="px-5 pt-[48px] pb-[64px] text-white lg:px-[118px] lg:pt-[76px] lg:pb-[84px]" style={{ backgroundColor: NAVY }}>
        <nav aria-label="Breadcrumb" className="text-[13px] leading-[18px] text-white/75">
          <ol className="flex flex-wrap items-center gap-[10px]">
            <li>
              <Link href={userRoutes.home} className="hover:underline">
                Home
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link href={userRoutes.yachts} className="hover:underline">
                Our yachts
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            {yacht && (
              <>
                <li>
                  <Link href={userRoutes.yacht(yacht.slug)} className="hover:underline">
                    {yacht.name}
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
              </>
            )}
            <li aria-current="page" className="text-white">
              Custom quote
            </li>
          </ol>
        </nav>

        <p className="mt-[40px] text-[12px] leading-[16px] tracking-[0.18em] text-white/75 uppercase">
          A private proposal
        </p>
        <h1 className="mt-[16px] text-[52px] leading-[1.08] font-normal tracking-[-1.5px] lg:text-[72px] lg:tracking-[-2.21px]">
          <span style={SANS}>A voyage,</span>
          <br />
          <span className="italic" style={SERIF}>
            made to measure.
          </span>
        </h1>
        <p className="mt-[28px] max-w-[440px] text-[16px] leading-[27px] text-white/85">
          Tell us what you have in mind. Our concierge will come back with a tailored proposal —
          yacht, route, menus and price — with no obligation to book.
        </p>
      </div>
      <div className="relative min-h-[280px] sm:min-h-[360px] lg:min-h-0">
        <Image
          src="/images/home/astra-houseboat-deck.jpg"
          alt="The wooden deck of a Kerala boat on still green water"
          fill
          preload
          sizes="(min-width: 1024px) 47vw, 100vw"
          className="object-cover object-right"
        />
      </div>
    </section>
  );
}

function Sidebar({ yacht, canEnquireFor }: { yacht: PlanCharterYacht | null; canEnquireFor: boolean }) {
  return (
    <aside className="grid gap-[20px] self-start">
      <div className="px-[30px] py-[32px]" style={{ backgroundColor: PANEL }}>
        <p className="text-[12px] leading-[16px] tracking-[0.18em] uppercase" style={{ color: MUTED }}>
          Your concierge
        </p>
        <p
          className="mt-[20px] text-[26px] leading-[32px] tracking-[-0.5px]"
          style={{ ...SANS, color: INK }}
        >
          Rather talk it through?
          <br />
          We’re happy to.
        </p>
        <a
          href={CONCIERGE_PHONE_HREF}
          className="mt-[24px] flex items-center gap-[14px] text-[16px] hover:underline"
        >
          <Phone aria-hidden="true" strokeWidth={1.5} className="size-[17px] shrink-0" />
          {CONCIERGE_PHONE}
        </a>
        <a
          href={`mailto:${CONCIERGE_EMAIL}`}
          className="mt-[20px] flex items-center gap-[14px] text-[16px] break-all hover:underline"
        >
          <Mail aria-hidden="true" strokeWidth={1.5} className="size-[17px] shrink-0" />
          {CONCIERGE_EMAIL}
        </a>
        <ol className="mt-[24px] space-y-[14px] border-t pt-[20px]" style={{ borderColor: BORDER }}>
          {steps.map((step, index) => (
            <li key={step} className="flex gap-[12px] text-[15px] leading-[22px]" style={{ color: BODY }}>
              <span style={{ color: MUTED }}>{String(index + 1).padStart(2, "0")}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      <div className="flex items-center gap-[18px] border border-[#e5e7eb] p-[24px]">
        {yacht?.imageUrl ? (
          <img
            src={yacht.imageUrl}
            alt=""
            className="aspect-square w-[100px] shrink-0 object-cover"
          />
        ) : (
          <Image
            src="/images/yachts/astra-one-arabian-sea.png"
            unoptimized
            width={100}
            height={100}
            alt=""
            className="aspect-square w-[100px] shrink-0 object-cover"
          />
        )}
        <div className="min-w-0">
          <p className="text-[15px] leading-[22px]">
            Know your dates already?{" "}
            {canEnquireFor && yacht
              ? `${yacht.name} can be reserved instantly.`
              : "Our yachts can be reserved online."}
          </p>
          <Link
            href={
              canEnquireFor && yacht ? userRoutes.yachtAvailability(yacht.slug) : userRoutes.yachts
            }
            className="mt-[8px] inline-flex items-center gap-[8px] border-b text-[12px] leading-[18px] tracking-[0.12em] uppercase"
            style={{ borderColor: INK }}
          >
            Check availability
            <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-[12px]" />
          </Link>
        </div>
      </div>
    </aside>
  );
}

export interface PlanCharterProps {
  yachts: PlanCharterYacht[];
  /** The yacht the customer came from, if any. */
  initialYachtSlug: string | null;
}

/** "Custom quote" enquiry screen. No payment or commitment is involved. */
export default function PlanCharter({ yachts, initialYachtSlug }: PlanCharterProps) {
  const [yachtSlug, setYachtSlug] = useState(initialYachtSlug);
  const [chosenDestinations, setChosenDestinations] = useState<string[]>([]);
  const [occasion, setOccasion] = useState<string | undefined>();
  const [start, setStart] = useState("");
  const [flexibleDates, setFlexibleDates] = useState(true);
  const [duration, setDuration] = useState<string | undefined>();
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [chosenLuxuries, setChosenLuxuries] = useState<string[]>([]);
  const [budget, setBudget] = useState<string | undefined>();
  const [contactMethod, setContactMethod] = useState("Email");
  const [destinationMissing, setDestinationMissing] = useState(false);
  const [prepared, setPrepared] = useState<CharterEnquiry | null>(null);

  const yacht = yachts.find((item) => item.slug === yachtSlug) ?? null;
  const toggle = (list: string[], option: string) =>
    list.includes(option) ? list.filter((item) => item !== option) : [...list, option];
  const pickOne = (current: string | undefined, option: string) =>
    current === option ? undefined : option;

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (chosenDestinations.length === 0) {
      setDestinationMissing(true);
      return;
    }
    const data = new FormData(event.currentTarget);
    const text = (key: string) => String(data.get(key) ?? "").trim() || undefined;
    setPrepared({
      fullName: text("fullName") ?? "",
      email: text("email") ?? "",
      phone: text("phone"),
      yacht: yacht?.name ?? HELP_ME_CHOOSE,
      destinations: chosenDestinations,
      occasion,
      start: text("start"),
      end: text("end"),
      flexibleDates,
      duration,
      adults,
      children,
      luxuries: chosenLuxuries,
      budget,
      message: text("message"),
      contactMethod,
    });
  }

  return (
    <div className="bg-white antialiased" style={{ ...SANS, color: INK }}>
      <MarinaFonts />
      <Hero yacht={yacht} />

      <section className="mx-auto grid w-full max-w-[1728px] gap-[56px] px-5 pt-[56px] pb-[96px] lg:px-[100px] lg:pt-[72px] xl:grid-cols-[minmax(0,1fr)_444px] xl:gap-[78px]">
        {prepared ? (
          <div role="status" className="max-w-[640px]">
            <p className="text-[32px] leading-[40px] tracking-[-1px]" style={{ ...SANS, color: INK }}>
              One last step, {prepared.fullName.split(" ")[0]}.
            </p>
            <p className="mt-[16px] text-[16px] leading-[27px]" style={{ color: BODY }}>
              Nothing has been sent yet. Your enquiry is ready as an email to our concierge: open it
              and press send, and it will reach us directly.
            </p>
            <div className="mt-[28px] flex flex-wrap items-center gap-[24px]">
              <a
                href={enquiryMailto(prepared)}
                className="inline-flex h-[60px] items-center gap-[24px] px-[28px] text-[12px] tracking-[0.18em] text-white uppercase transition-opacity hover:opacity-90"
                style={{ backgroundColor: NAVY }}
              >
                Email my enquiry
                <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-[13px]" />
              </a>
              <button
                type="button"
                className="underline underline-offset-2"
                onClick={() => setPrepared(null)}
              >
                Back to my enquiry
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="min-w-0">
            <SectionHeading number="01">Your voyage</SectionHeading>
            <Chips
              label="Which yacht are you drawn to?"
              options={[...yachts.map((item) => item.name), HELP_ME_CHOOSE]}
              selected={[yacht?.name ?? HELP_ME_CHOOSE]}
              onToggle={(name) =>
                setYachtSlug(yachts.find((item) => item.name === name)?.slug ?? null)
              }
            />
            <Chips
              label="Where would you like to go?"
              hint="Choose any"
              options={destinations}
              selected={chosenDestinations}
              onToggle={(option) => {
                setChosenDestinations(toggle(chosenDestinations, option));
                setDestinationMissing(false);
              }}
            />
            {destinationMissing && (
              <p role="alert" className="mt-[8px] text-[13px] leading-[18px] text-[#b42318]">
                Choose at least one destination, or Surprise me.
              </p>
            )}
            <Chips
              label="What’s the occasion?"
              options={occasions}
              selected={occasion ? [occasion] : []}
              onToggle={(option) => setOccasion(pickOne(occasion, option))}
            />

            <div className="mt-[56px]">
              <SectionHeading number="02">When &amp; who</SectionHeading>
            </div>
            <div className="mt-[24px] grid gap-[20px] sm:grid-cols-2">
              <div className="min-w-0">
                <label htmlFor="start" className={labelClass}>
                  Preferred start
                </label>
                <input
                  id="start"
                  name="start"
                  type="date"
                  value={start}
                  onChange={(event) => setStart(event.currentTarget.value)}
                  className={cx(fieldClass, "mt-[8px]")}
                  style={{ borderColor: BORDER }}
                />
              </div>
              <div className="min-w-0">
                <label htmlFor="end" className={labelClass}>
                  Preferred end
                </label>
                <input
                  id="end"
                  name="end"
                  type="date"
                  min={start || undefined}
                  className={cx(fieldClass, "mt-[8px]")}
                  style={{ borderColor: BORDER }}
                />
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={flexibleDates}
              onClick={() => setFlexibleDates(!flexibleDates)}
              className="mt-[24px] flex items-center gap-[12px] text-[15px]"
            >
              <span
                aria-hidden="true"
                className={cx(
                  "flex h-[24px] w-[44px] items-center rounded-full p-[3px] transition-colors",
                  flexibleDates ? "justify-end bg-[#0d1b2a]" : "justify-start bg-[#c9ccd0]",
                )}
              >
                <span className="size-[18px] rounded-full bg-white" />
              </span>
              My dates are flexible
            </button>
            <Chips
              label="How long would you like to be aboard?"
              options={durations}
              selected={duration ? [duration] : []}
              onToggle={(option) => setDuration(pickOne(duration, option))}
            />
            <div className="mt-[24px] flex flex-wrap gap-x-[40px] gap-y-[20px]">
              <Counter label="Adults" hint="13 and over" value={adults} min={1} onChange={setAdults} />
              <Counter label="Children" hint="Under 13" value={children} min={0} onChange={setChildren} />
            </div>

            <div className="mt-[56px]">
              <SectionHeading number="03">Little luxuries</SectionHeading>
            </div>
            <Chips
              label="Anything you’d like us to arrange?"
              hint="Choose any"
              options={luxuries}
              selected={chosenLuxuries}
              onToggle={(option) => setChosenLuxuries(toggle(chosenLuxuries, option))}
            />
            <Chips
              label="Indicative budget for the charter"
              options={budgets}
              selected={budget ? [budget] : []}
              onToggle={(option) => setBudget(pickOne(budget, option))}
            />
            <div className="mt-[24px]">
              <label htmlFor="message" className={labelClass}>
                Tell us about your journey
              </label>
              <textarea
                id="message"
                name="message"
                rows={4}
                placeholder="A surprise anniversary, a sunset dinner off Kavaratti, vegetarian menus…"
                className={cx(fieldClass, "mt-[8px] h-[120px] resize-y py-[14px]")}
                style={{ borderColor: BORDER }}
              />
            </div>

            <div className="mt-[56px]">
              <SectionHeading number="04">How we reach you</SectionHeading>
            </div>
            <div className="mt-[24px] grid gap-[20px] md:grid-cols-3">
              <div className="min-w-0">
                <label htmlFor="fullName" className={labelClass}>
                  Full name
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  required
                  autoComplete="name"
                  className={cx(fieldClass, "mt-[8px]")}
                  style={{ borderColor: BORDER }}
                />
              </div>
              <div className="min-w-0">
                <label htmlFor="email" className={labelClass}>
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={cx(fieldClass, "mt-[8px]")}
                  style={{ borderColor: BORDER }}
                />
              </div>
              <div className="min-w-0">
                <label htmlFor="phone" className={labelClass}>
                  Phone
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+91"
                  className={cx(fieldClass, "mt-[8px]")}
                  style={{ borderColor: BORDER }}
                />
              </div>
            </div>
            <Chips
              label="Best way to reach you"
              options={contactMethods}
              selected={[contactMethod]}
              onToggle={setContactMethod}
            />

            <label className="mt-[28px] flex items-start gap-[10px] text-[14px] leading-[20px]" style={{ color: BODY }}>
              <input
                type="checkbox"
                name="consent"
                required
                className="mt-[3px] size-[14px] shrink-0 cursor-pointer accent-[#0d1b2a]"
              />
              <span>
                I agree to the privacy policy and consent to being contacted about my enquiry.
              </span>
            </label>

            <div className="mt-[28px] flex flex-wrap items-center gap-x-[28px] gap-y-[16px] border-t border-[#e5e7eb] pt-[32px]">
              <button
                type="submit"
                className="inline-flex h-[60px] items-center gap-[24px] px-[28px] text-[12px] tracking-[0.18em] text-white uppercase transition-opacity hover:opacity-90"
                style={{ backgroundColor: NAVY }}
              >
                Send my enquiry
                <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-[13px]" />
              </button>
              <p className="max-w-[360px] text-[14px] leading-[21px]" style={{ color: BODY }}>
                No payment and no commitment. Your details are only used to prepare your proposal.
              </p>
            </div>
          </form>
        )}

        <Sidebar yacht={yacht} canEnquireFor={Boolean(yacht?.instant)} />
      </section>

      <MarinaFooter />
    </div>
  );
}
