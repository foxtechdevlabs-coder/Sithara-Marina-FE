"use client";

/* eslint-disable @next/next/no-img-element -- yacht photos come from the API and their host is not configured */
import { ArrowRight, Mail, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type ReactNode, type SubmitEvent } from "react";
import { z } from "zod";

import { INK, MarinaFonts, MarinaFooter, NAVY, SANS, SERIF } from "@/components/user/marina-chrome";
import { userRoutes } from "@/constants/routes";
import { useAuthSession } from "@/features/user/auth/session";
import { commonAuthErrorMessage } from "@/features/user/auth/utils/auth-error-message";
import { formatWait } from "@/features/user/auth/utils/format-wait";
import { formatClockTime, todayIn } from "@/features/user/yachts/utils/yacht-view";
import { useApiQuery } from "@/hooks/use-api-query";
import { cx } from "@/lib/cx";
import { isApiError } from "@/services/http/api-error";
import { getBackendErrorDetails } from "@/services/http/backend-error";
import {
  createEnquiry,
  ENQUIRY_CONTEXT_MAX_BYTES,
  ENQUIRY_MESSAGE_MAX_LENGTH,
  ENQUIRY_NAME_MAX_LENGTH,
  type CreateEnquiryRequest,
  type EnquiryCreated,
} from "@/services/user/enquiries.service";
import { getYacht } from "@/services/user/yachts.service";
import { emailSchema } from "@/validation/email";

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

const ANY_PACKAGE = "Any package";
const ANY_TIME = "Any time";
const MARINA_TIMEZONE = "Asia/Kolkata";

/** E.164, as the backend requires. Spaces, dashes and brackets are forgiven. */
const phoneSchema = z
  .string()
  .transform((value) => value.replace(/[\s()-]/g, ""))
  .pipe(
    z.string().regex(/^\+[1-9]\d{6,14}$/, {
      error: "Enter your phone number with its country code, like +919876543210.",
    }),
  );

type FieldKey = "fullName" | "email" | "phone" | "start" | "end" | "guests" | "message" | "consent";
type FieldErrors = Partial<Record<FieldKey, string>>;

/** Customer text for a failed POST /enquiries. Raw server messages are never shown. */
function enquiryErrorMessage(error: unknown): string {
  const { code } = getBackendErrorDetails(error);
  if (code === "INVALID_SLOT_TYPE") {
    return "That package is no longer offered on this yacht. Choose another package, or Any package.";
  }
  if (code === "GUESTS_EXCEED_CAPACITY") return "That’s more guests than this yacht can take.";
  if (code === "YACHT_NOT_FOUND" || (isApiError(error) && error.status === 404)) {
    return "We couldn’t find that yacht. Please choose another, or Help me choose.";
  }
  if (isApiError(error)) {
    if (error.status === 429) {
      const wait = error.retryAfterSeconds;
      return `You’ve sent several enquiries in a short time. Please wait ${wait !== undefined ? formatWait(wait) : "a minute"} and try again.`;
    }
    if (error.status === 401) return "Your sign-in has expired. Please sign in again and resend your enquiry.";
    if (error.status === 403) {
      return "Staff accounts can’t send customer enquiries. Please sign out and try again.";
    }
    if (error.status === 400) return "Please check your details and try again.";
  }
  return commonAuthErrorMessage(error) ?? "We couldn’t send your enquiry. Please try again.";
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
  max,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  /** The most allowed now, from the chosen yacht's capacity. None without a yacht. */
  max?: number;
  onChange: (value: number) => void;
}) {
  // What is typed, while typing. Only whole numbers reach `onChange`; a blank or
  // too-small entry snaps back to the last valid value when the field is left.
  const [draft, setDraft] = useState<string | null>(null);
  const stepClass =
    "flex size-[52px] shrink-0 items-center justify-center border bg-white text-[20px] disabled:cursor-not-allowed disabled:opacity-40";
  const fieldId = `count-${label.toLowerCase()}`;
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
        <input
          id={fieldId}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="off"
          aria-label={`Number of ${label.toLowerCase()}`}
          value={draft ?? String(value)}
          onChange={(event) => {
            const digits = event.currentTarget.value.replace(/\D/g, "").slice(0, 3);
            setDraft(digits);
            if (digits !== "" && Number(digits) >= min) onChange(Number(digits));
          }}
          onBlur={() => setDraft(null)}
          className="h-[52px] w-[64px] border bg-white text-center text-[20px] outline-none focus:border-[#0d1b2a]"
          style={{ borderColor: BORDER }}
        />
        <button
          type="button"
          aria-label={`More ${label.toLowerCase()}`}
          disabled={max !== undefined && value >= max}
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
  /** The backend id, sent as `yacht_id`. */
  id: string;
  /** Most guests on board, checked before sending. */
  capacity: number;
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
  /** The link named a yacht that could not be found or loaded. */
  requestedYachtMissing?: boolean;
}

/**
 * "Custom quote" enquiry screen, sent to POST /enquiries. No payment or
 * commitment is involved: an enquiry is never a booking.
 */
export default function PlanCharter({
  yachts,
  initialYachtSlug,
  requestedYachtMissing = false,
}: PlanCharterProps) {
  const signedIn = useAuthSession() !== null;
  const [yachtSlug, setYachtSlug] = useState(initialYachtSlug);
  const [packageId, setPackageId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<string | null>(null);
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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<{ enquiry: EnquiryCreated; firstName: string } | null>(null);
  const inFlight = useRef(false);
  const [today] = useState(() => todayIn(MARINA_TIMEZONE));

  const yacht = yachts.find((item) => item.slug === yachtSlug) ?? null;
  // A chosen yacht's real packages and start times (public GET /yachts/{slug}).
  const detail = useApiQuery(
    (signal) => (yachtSlug ? getYacht(yachtSlug, signal) : Promise.resolve(null)),
    yachtSlug ?? "",
  );
  const detailLoaded = detail.data?.slug === yachtSlug ? detail.data : null;
  const packages = detailLoaded?.slot_types ?? [];
  // The yacht's own record is the authority on capacity; the listing's is the fallback.
  const capacity = yacht ? (detailLoaded?.capacity ?? yacht.capacity) : null;
  const overCapacity = capacity !== null && adults + children > capacity;
  const chosenPackage = packages.find((item) => item.id === packageId) ?? null;
  const clearError = (key: FieldKey) =>
    setFieldErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  const errorText = (key: FieldKey) =>
    fieldErrors[key] ? (
      <p id={`${key}-error`} role="alert" className="mt-[8px] text-[13px] leading-[18px] text-[#b42318]">
        {fieldErrors[key]}
      </p>
    ) : null;
  const toggle = (list: string[], option: string) =>
    list.includes(option) ? list.filter((item) => item !== option) : [...list, option];
  const pickOne = (current: string | undefined, option: string) =>
    current === option ? undefined : option;

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const data = new FormData(event.currentTarget);
    const text = (key: string) => String(data.get(key) ?? "").trim();
    const errors: FieldErrors = {};

    const fullName = text("fullName");
    if (!fullName) errors.fullName = "Enter your full name.";
    else if (fullName.length > ENQUIRY_NAME_MAX_LENGTH) errors.fullName = "That name is too long.";

    // A signed-in customer's enquiry uses their account email, so none is sent.
    let email: string | undefined;
    if (!signedIn) {
      const parsed = emailSchema.safeParse(text("email"));
      if (parsed.success) email = parsed.data;
      else errors.email = parsed.error.issues[0]?.message ?? "Enter a valid email address.";
    }

    const phone = phoneSchema.safeParse(text("phone"));
    if (!phone.success) {
      errors.phone = phone.error.issues[0]?.message ?? "Enter your phone number with its country code.";
    }

    const startDate = text("start");
    const endDate = text("end");
    if (startDate && startDate < today) errors.start = "Choose today or a later date.";
    if (startDate && endDate && endDate < startDate) errors.end = "The end can’t be before the start.";

    const guests = adults + children;
    if (yacht && capacity !== null && guests > capacity) {
      errors.guests = `${yacht.name} takes up to ${capacity} guests.`;
    }

    const message = text("message");
    if (message.length > ENQUIRY_MESSAGE_MAX_LENGTH) {
      errors.message = `Please keep this under ${ENQUIRY_MESSAGE_MAX_LENGTH} characters.`;
    }
    if (!data.get("consent")) {
      errors.consent = "Please agree, so our concierge can contact you about your enquiry.";
    }

    setDestinationMissing(chosenDestinations.length === 0);
    setFieldErrors(errors);
    if (chosenDestinations.length === 0 || Object.keys(errors).length > 0 || !phone.success) {
      setFormError("Please check the highlighted details.");
      return;
    }

    // The customer's other choices have no field of their own: they go in
    // `context`, stored as sent. Only what they actually chose is included.
    const context: Record<string, unknown> = {
      destinations: chosenDestinations,
      ...(occasion ? { occasion } : {}),
      ...(endDate ? { preferred_end_date: endDate } : {}),
      flexible_dates: flexibleDates,
      ...(duration ? { duration } : {}),
      adults,
      children,
      ...(chosenLuxuries.length > 0 ? { luxuries: chosenLuxuries } : {}),
      ...(budget ? { budget } : {}),
      contact_method: contactMethod,
    };
    const fits = new TextEncoder().encode(JSON.stringify(context)).length <= ENQUIRY_CONTEXT_MAX_BYTES;

    const request: CreateEnquiryRequest = {
      full_name: fullName,
      ...(email ? { email } : {}),
      phone: phone.data,
      ...(yacht ? { yacht_id: yacht.id } : {}),
      ...(yacht && chosenPackage ? { slot_type_id: chosenPackage.id } : {}),
      ...(startDate ? { preferred_date: startDate } : {}),
      ...(chosenPackage && startTime ? { preferred_start_time: startTime } : {}),
      guests,
      ...(message ? { message } : {}),
      ...(fits ? { context } : {}),
    };

    inFlight.current = true;
    setSending(true);
    setFormError(null);
    try {
      const enquiry = await createEnquiry(request);
      setSent({ enquiry, firstName: fullName.split(" ")[0] ?? fullName });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setFormError(enquiryErrorMessage(error));
      if (getBackendErrorDetails(error).code === "INVALID_SLOT_TYPE") {
        setPackageId(null);
        setStartTime(null);
        detail.reload(); // the yacht's packages have changed
      }
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }

  return (
    <div className="bg-white antialiased" style={{ ...SANS, color: INK }}>
      <MarinaFonts />
      <Hero yacht={yacht} />

      <section className="mx-auto grid w-full max-w-[1728px] gap-[56px] px-5 pt-[56px] pb-[96px] lg:px-[100px] lg:pt-[72px] xl:grid-cols-[minmax(0,1fr)_444px] xl:gap-[78px]">
        {sent ? (
          <div role="status" className="max-w-[640px]">
            <p className="text-[12px] leading-[16px] tracking-[0.18em] uppercase" style={{ color: MUTED }}>
              Enquiry received
            </p>
            <p
              className="mt-[16px] text-[32px] leading-[40px] tracking-[-1px]"
              style={{ ...SANS, color: INK }}
            >
              Thank you, {sent.firstName}.
            </p>
            <p className="mt-[16px] text-[16px] leading-[27px]" style={{ color: BODY }}>
              Your enquiry has been sent to our concierge, who will come back to you with a tailored
              proposal. Nothing has been booked or charged.
            </p>
            <div className="mt-[28px] border px-[24px] py-[20px]" style={{ borderColor: BORDER }}>
              <p className="text-[12px] leading-[16px] tracking-[0.18em] uppercase" style={{ color: MUTED }}>
                Your reference
              </p>
              <p className="mt-[6px] text-[26px] leading-[32px] tracking-[0.02em]">
                {sent.enquiry.reference}
              </p>
              <p className="mt-[6px] text-[14px] leading-[21px]" style={{ color: BODY }}>
                Status: awaiting our team’s response. Please quote this reference if you contact us.
              </p>
            </div>
            <div className="mt-[28px] flex flex-wrap items-center gap-[24px]">
              {signedIn && (
                <Link
                  href={userRoutes.accountEnquiries}
                  className="inline-flex h-[60px] items-center gap-[24px] px-[28px] text-[12px] tracking-[0.18em] text-white uppercase transition-opacity hover:opacity-90"
                  style={{ backgroundColor: NAVY }}
                >
                  View my enquiries
                  <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-[13px]" />
                </Link>
              )}
              <Link href={userRoutes.yachts} className="underline underline-offset-2">
                Explore our yachts
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="min-w-0">
            <SectionHeading number="01">Your voyage</SectionHeading>
            <Chips
              label="Which yacht are you drawn to?"
              options={[...yachts.map((item) => item.name), HELP_ME_CHOOSE]}
              selected={[yacht?.name ?? HELP_ME_CHOOSE]}
              onToggle={(name) => {
                setYachtSlug(yachts.find((item) => item.name === name)?.slug ?? null);
                setPackageId(null);
                setStartTime(null);
                clearError("guests");
              }}
            />
            {requestedYachtMissing && !yacht && (
              <p role="alert" className="mt-[10px] text-[13px] leading-[18px] text-[#b42318]">
                We couldn’t find the yacht you came from. Please choose one above, or Help me
                choose.
              </p>
            )}
            {yacht && Boolean(detail.error) && !detail.loading && (
              <p role="alert" className="mt-[10px] text-[13px] leading-[18px] text-[#b42318]">
                We couldn’t load {yacht.name}’s packages just now.{" "}
                <button type="button" className="underline underline-offset-2" onClick={detail.reload}>
                  Try again
                </button>
                , choose another yacht, or send your enquiry without a package.
              </p>
            )}
            {yacht && packages.length > 0 && (
              <Chips
                label="Which package?"
                hint="Optional"
                options={[...packages.map((item) => item.name), ANY_PACKAGE]}
                selected={[chosenPackage?.name ?? ANY_PACKAGE]}
                onToggle={(name) => {
                  setPackageId(packages.find((item) => item.name === name)?.id ?? null);
                  setStartTime(null);
                }}
              />
            )}
            {chosenPackage && chosenPackage.start_times.length > 0 && (
              <Chips
                label="Preferred start time"
                hint="Optional"
                options={[...chosenPackage.start_times.map(formatClockTime), ANY_TIME]}
                selected={[startTime ? formatClockTime(startTime) : ANY_TIME]}
                onToggle={(label) =>
                  setStartTime(
                    chosenPackage.start_times.find((time) => formatClockTime(time) === label) ?? null,
                  )
                }
              />
            )}
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
                  min={today}
                  value={start}
                  aria-invalid={Boolean(fieldErrors.start)}
                  aria-describedby={fieldErrors.start ? "start-error" : undefined}
                  onChange={(event) => {
                    setStart(event.currentTarget.value);
                    clearError("start");
                  }}
                  className={cx(fieldClass, "mt-[8px] aria-[invalid=true]:!border-[#b42318]")}
                  style={{ borderColor: BORDER }}
                />
                {errorText("start")}
              </div>
              <div className="min-w-0">
                <label htmlFor="end" className={labelClass}>
                  Preferred end
                </label>
                <input
                  id="end"
                  name="end"
                  type="date"
                  min={start || today}
                  aria-invalid={Boolean(fieldErrors.end)}
                  aria-describedby={fieldErrors.end ? "end-error" : undefined}
                  onChange={() => clearError("end")}
                  className={cx(fieldClass, "mt-[8px]")}
                  style={{ borderColor: BORDER }}
                />
                {errorText("end")}
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
              <Counter
                label="Adults"
                hint="13 and over"
                value={adults}
                min={1}
                max={capacity === null ? undefined : Math.max(1, capacity - children)}
                onChange={(value) => {
                  setAdults(value);
                  clearError("guests");
                }}
              />
              <Counter
                label="Children"
                hint="Under 13"
                value={children}
                min={0}
                max={capacity === null ? undefined : Math.max(0, capacity - adults)}
                onChange={(value) => {
                  setChildren(value);
                  clearError("guests");
                }}
              />
            </div>
            {capacity !== null && (
              <p className="mt-[10px] text-[13px] leading-[18px]" style={{ color: MUTED }}>
                Up to {capacity} guests aboard {yacht?.name}.
              </p>
            )}
            {fieldErrors.guests ? (
              errorText("guests")
            ) : overCapacity && yacht ? (
              <p role="alert" className="mt-[8px] text-[13px] leading-[18px] text-[#b42318]">
                That’s more than {yacht.name} takes. Please choose up to {capacity} guests, or
                another yacht.
              </p>
            ) : null}

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
                maxLength={ENQUIRY_MESSAGE_MAX_LENGTH}
                aria-invalid={Boolean(fieldErrors.message)}
                onChange={() => clearError("message")}
                placeholder="A surprise anniversary, a sunset dinner off Kavaratti, vegetarian menus…"
                className={cx(fieldClass, "mt-[8px] h-[120px] resize-y py-[14px]")}
                style={{ borderColor: BORDER }}
              />
              {errorText("message")}
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
                  maxLength={ENQUIRY_NAME_MAX_LENGTH}
                  aria-invalid={Boolean(fieldErrors.fullName)}
                  aria-describedby={fieldErrors.fullName ? "fullName-error" : undefined}
                  onChange={() => clearError("fullName")}
                  className={cx(fieldClass, "mt-[8px] aria-[invalid=true]:!border-[#b42318]")}
                  style={{ borderColor: BORDER }}
                />
                {errorText("fullName")}
              </div>
              {signedIn ? (
                <div className="min-w-0">
                  <p className={labelClass}>Email</p>
                  <p className="mt-[8px] text-[14px] leading-[21px]" style={{ color: BODY }}>
                    You’re signed in, so we’ll reply to your account email.
                  </p>
                </div>
              ) : (
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
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={fieldErrors.email ? "email-error" : undefined}
                    onChange={() => clearError("email")}
                    className={cx(fieldClass, "mt-[8px] aria-[invalid=true]:!border-[#b42318]")}
                    style={{ borderColor: BORDER }}
                  />
                  {errorText("email")}
                </div>
              )}
              <div className="min-w-0">
                <label htmlFor="phone" className={labelClass}>
                  Phone, with country code
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  required
                  autoComplete="tel"
                  placeholder="+919876543210"
                  aria-invalid={Boolean(fieldErrors.phone)}
                  aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
                  onChange={() => clearError("phone")}
                  className={cx(fieldClass, "mt-[8px] aria-[invalid=true]:!border-[#b42318]")}
                  style={{ borderColor: BORDER }}
                />
                {errorText("phone")}
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
                aria-invalid={Boolean(fieldErrors.consent)}
                onChange={() => clearError("consent")}
                className="mt-[3px] size-[14px] shrink-0 cursor-pointer accent-[#0d1b2a]"
              />
              <span>
                I agree to the privacy policy and consent to being contacted about my enquiry.
              </span>
            </label>
            {errorText("consent")}
            {formError && (
              <p
                role="alert"
                className="mt-[20px] border-l-2 border-[#b42318] pl-[12px] text-[14px] leading-[21px]"
                style={{ color: BODY }}
              >
                {formError}
              </p>
            )}

            <div className="mt-[28px] flex flex-wrap items-center gap-x-[28px] gap-y-[16px] border-t border-[#e5e7eb] pt-[32px]">
              <button
                type="submit"
                disabled={sending}
                className="inline-flex h-[60px] items-center gap-[24px] px-[28px] text-[12px] tracking-[0.18em] text-white uppercase transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
                style={{ backgroundColor: NAVY }}
              >
                {sending ? "Sending your enquiry…" : "Send my enquiry"}
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
