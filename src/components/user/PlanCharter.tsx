"use client";

import { ArrowRight, ChevronDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode, type SubmitEvent } from "react";

import charterImage from "@/components/assets/Image (A private yacht on the calm Arabian Sea off Kerala).png";
import {
  INK,
  MarinaFonts,
  MarinaFooter,
  MarinaHeader,
  SANS,
} from "@/components/user/marina-chrome";
import { userRoutes } from "@/constants/routes";

/* ------------------------------------------------------------------ */
/* Figma colours                                                       */
/* ------------------------------------------------------------------ */

const BODY = "#4a4f55"; // paragraph text
const MUTED = "#7a7f85"; // breadcrumb
const OLIVE = "#8a8d5c"; // required asterisk, "Optional" tag, step numbers
const LINE = "#8f9296"; // field underline

/* ------------------------------------------------------------------ */
/* DUMMY form options — replace with API data once it is ready.        */
/* ------------------------------------------------------------------ */

const destinations = [
  "Kerala Backwaters",
  "Lakshadweep Islands",
  "The Malabar Coast",
  "The Maldives",
];
const guestOptions = ["1–2 guests", "3–4 guests", "5–6 guests", "7–8 guests", "9–12 guests"];
const durations = ["Half a day", "A full day", "2–3 nights", "4–7 nights", "More than a week"];
const yachts = ["Astra One", "Malabar", "Neelam", "Ananta", "Not sure yet"];

const steps = [
  {
    title: "We get to know you.",
    text: "Your dates, your people, your idea of a perfect journey.",
  },
  {
    title: "We bring the possibilities.",
    text: "A considered yacht selection and a personal charter proposal.",
  },
  { title: "You make it your own.", text: "We refine the details together before you commit." },
];

/** Shape of the enquiry, ready to send to the API. */
export interface CharterEnquiry {
  fullName: string;
  email: string;
  phone?: string;
  destination: string;
  guests: string;
  departure?: string;
  duration?: string;
  yacht?: string;
  message?: string;
  consent: boolean;
}

/* ------------------------------------------------------------------ */
/* Form building blocks                                                */
/* ------------------------------------------------------------------ */

const fieldClass =
  "h-[43px] w-full rounded-none border-0 border-b bg-transparent px-0 text-[13px] text-[#1b2733] outline-none placeholder:text-[#9a9da1] focus:border-[#0d1b2a]";

function FieldLabel({
  htmlFor,
  children,
  required,
  optional,
}: {
  htmlFor: string;
  children: ReactNode;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="flex items-center text-[13px] leading-[18px] text-[#1b2733]"
    >
      {children}
      {required && (
        <span aria-hidden="true" className="ml-[6px] text-[11px]" style={{ color: OLIVE }}>
          *
        </span>
      )}
      {optional && (
        <span className="ml-[10px] text-[9px]" style={{ color: OLIVE }}>
          Optional
        </span>
      )}
    </label>
  );
}

function SelectField({
  id,
  name,
  options,
  required,
}: {
  id: string;
  name: keyof CharterEnquiry;
  options: string[];
  required?: boolean;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        name={name}
        required={required}
        defaultValue=""
        className={`${fieldClass} cursor-pointer appearance-none pr-8`}
        style={{ borderColor: LINE }}
      >
        <option value="" disabled hidden />
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        strokeWidth={1.75}
        className="pointer-events-none absolute top-1/2 right-[6px] size-[15px] -translate-y-1/2"
        style={{ color: INK }}
      />
    </div>
  );
}

/** Date input that stays blank (no "dd-mm-yyyy" hint or icon) until used, as in the Figma. */
function DateField({ id, name }: { id: string; name: keyof CharterEnquiry }) {
  const [hasValue, setHasValue] = useState(false);
  return (
    <input
      id={id}
      name={name}
      type="date"
      onChange={(e) => setHasValue(e.currentTarget.value !== "")}
      onClick={(e) => e.currentTarget.showPicker?.()}
      className={`${fieldClass} cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0 ${
        hasValue ? "" : "text-transparent focus:text-[#1b2733]"
      }`}
      style={{ borderColor: LINE }}
    />
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-[24px] leading-[30px] tracking-[-0.5px]" style={{ ...SANS, color: INK }}>
      {children}
    </h3>
  );
}

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

function Intro() {
  return (
    <div>
      {/* Figma: Switzer 400, 72px, letter-spacing -2.21px */}
      <h1
        className="max-w-[460px] text-[48px] lg:-mt-[5px] leading-[54px] font-normal tracking-[-1.5px] lg:text-[72px] lg:leading-[76px] lg:tracking-[-2.21px]"
        style={{ ...SANS, color: INK }}
      >
        Where would you like to be?
      </h1>
      <p className="mt-[24px] max-w-[455px] text-[16px] leading-[27.5px]" style={{ color: BODY }}>
        The perfect escape begins with a conversation. Share a few details, and we&rsquo;ll help you
        find your yacht, your destination, and your own way to experience the water.
      </p>

      <Image
        src={charterImage}
        alt="A private yacht on the calm Arabian Sea off Kerala"
        preload
        sizes="(min-width: 1024px) 553px, 100vw"
        className="mt-[32px] aspect-[553/299] w-full max-w-[553px] object-cover"
      />

      <p
        className="mt-[59px] text-[12px] leading-[16px] tracking-[0.18em] uppercase"
        style={{ color: INK }}
      >
        What happens next
      </p>
      <ol className="mt-[29px] space-y-[23px]">
        {steps.map((step, i) => (
          <li key={step.title} className="grid grid-cols-[28px_1fr] items-baseline">
            <span className="text-[9px] tracking-[0.2em]" style={{ color: OLIVE }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <p
                className="text-[24px] leading-[30px] tracking-[-0.5px]"
                style={{ ...SANS, color: INK }}
              >
                {step.title}
              </p>
              <p className="mt-[7px] text-[12px] leading-[16px] text-[#3f454b]">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="mt-[42px] max-w-[520px] text-[16px] leading-[28px]" style={{ color: BODY }}>
        Personally arranged from Kochi, Kerala. Private journeys. Thoughtfully considered.
      </p>
    </div>
  );
}

function EnquiryForm() {
  const [submitted, setSubmitted] = useState<CharterEnquiry | null>(null);

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = (key: keyof CharterEnquiry) => String(data.get(key) ?? "").trim() || undefined;
    const enquiry: CharterEnquiry = {
      fullName: text("fullName") ?? "",
      email: text("email") ?? "",
      phone: text("phone"),
      destination: text("destination") ?? "",
      guests: text("guests") ?? "",
      departure: text("departure"),
      duration: text("duration"),
      yacht: text("yacht"),
      message: text("message"),
      consent: data.get("consent") === "on",
    };
    // TODO: send `enquiry` to the API once the endpoint is ready.
    setSubmitted(enquiry);
  }

  return (
    <div className="bg-[#f5f5f5] px-5 pt-[48px] pb-[56px] sm:px-[36px] lg:pt-[56px] lg:pb-[69px]">
      <h2
        className="text-[30px] leading-[36px] tracking-[-0.8px] lg:text-[36px] lg:leading-[43px]"
        style={{ ...SANS, color: INK }}
      >
        Tell us a little
        <br />
        about your journey.
      </h2>

      {submitted ? (
        <div role="status" className="mt-[58px] text-[16px] leading-[27px]" style={{ color: BODY }}>
          <p className="text-[24px] leading-[30px]" style={{ ...SANS, color: INK }}>
            Thank you, {submitted.fullName.split(" ")[0]}.
          </p>
          <p className="mt-3">
            We&rsquo;ve received your enquiry and will be in touch at {submitted.email} shortly.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-[58px]">
          <fieldset>
            <legend className="contents">
              <SectionTitle>About you</SectionTitle>
            </legend>
            <div className="mt-[20px] grid gap-x-[24px] gap-y-[21px] sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="fullName" required>
                  Full name
                </FieldLabel>
                <input
                  id="fullName"
                  name="fullName"
                  required
                  autoComplete="name"
                  placeholder="Your full name"
                  className={fieldClass}
                  style={{ borderColor: LINE }}
                />
              </div>
              <div>
                <FieldLabel htmlFor="email" required>
                  Email address
                </FieldLabel>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={fieldClass}
                  style={{ borderColor: LINE }}
                />
              </div>
              <div className="sm:col-span-2">
                <FieldLabel htmlFor="phone" optional>
                  Phone number
                </FieldLabel>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="Include your country code"
                  className={fieldClass}
                  style={{ borderColor: LINE }}
                />
              </div>
            </div>
          </fieldset>

          <fieldset className="mt-[27px]">
            <legend className="contents">
              <SectionTitle>Your time on the water</SectionTitle>
            </legend>
            <div className="mt-[18px] grid gap-x-[24px] gap-y-[21px] sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="destination" required>
                  Destination
                </FieldLabel>
                <SelectField id="destination" name="destination" options={destinations} required />
              </div>
              <div>
                <FieldLabel htmlFor="guests" required>
                  Number of guests
                </FieldLabel>
                <SelectField id="guests" name="guests" options={guestOptions} required />
              </div>
              <div>
                <FieldLabel htmlFor="departure" optional>
                  Preferred departure
                </FieldLabel>
                <DateField id="departure" name="departure" />
              </div>
              <div>
                <FieldLabel htmlFor="duration">How long do you have?</FieldLabel>
                <SelectField id="duration" name="duration" options={durations} />
              </div>
              <div className="sm:col-span-2">
                <FieldLabel htmlFor="yacht">A yacht in mind?</FieldLabel>
                <SelectField id="yacht" name="yacht" options={yachts} />
              </div>
              <div className="mt-[7px] sm:col-span-2">
                <FieldLabel htmlFor="message" optional>
                  Anything else you&rsquo;d like us to know?
                </FieldLabel>
                <textarea
                  id="message"
                  name="message"
                  rows={4}
                  placeholder="A special occasion, a favourite place, or simply an idea…"
                  className={`${fieldClass} h-[100px] resize-none pt-[13px]`}
                  style={{ borderColor: LINE }}
                />
              </div>
            </div>
          </fieldset>

          <label className="mt-[27px] flex items-center gap-[10px] text-[11px] leading-[16px] text-[#1b2733]">
            <input
              type="checkbox"
              name="consent"
              required
              className="size-[13px] shrink-0 cursor-pointer accent-[#0d1b2a]"
            />
            <span>
              I agree to the{" "}
              <Link href={userRoutes.privacy} className="underline underline-offset-2">
                privacy policy
              </Link>{" "}
              and consent to being contacted about my enquiry.
            </span>
          </label>

          <button
            type="submit"
            className="mt-[28px] flex h-[51px] w-full items-center justify-between bg-black px-[21px] text-[12px] tracking-[0.18em] text-white uppercase transition-opacity hover:opacity-90"
          >
            Send your enquiry
            <ArrowRight className="size-[13px]" strokeWidth={1.5} aria-hidden="true" />
          </button>
          <p className="mt-[12px] text-center text-[13px] leading-[18px] text-[#1b2733]">
            A conversation, not a commitment. No payment required.
          </p>
        </form>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

/** "Plan your charter" enquiry screen, built from the Figma design (1728px frame). */
export default function PlanCharter() {
  return (
    <div className="bg-white antialiased" style={{ ...SANS, color: INK }}>
      <MarinaFonts />
      <MarinaHeader />

      <section className="mx-auto w-full max-w-[1728px] px-5 pt-[37px] pb-[120px] lg:px-[clamp(40px,10.82vw,187px)] lg:pb-[157px]">
        <nav
          aria-label="Breadcrumb"
          className="text-[12px] leading-[16px]"
          style={{ color: MUTED }}
        >
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
              Plan your charter
            </li>
          </ol>
        </nav>

        <div className="mt-[48px] grid gap-14 lg:mt-[56px] lg:grid-cols-[minmax(0,687fr)_minmax(0,676fr)] lg:gap-0">
          <Intro />
          <EnquiryForm />
        </div>
      </section>

      <MarinaFooter />
    </div>
  );
}
