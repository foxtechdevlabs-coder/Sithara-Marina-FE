"use client";

import { Check, ChevronDown, Clock, Lock, MapPin } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { INK, SANS, SERIF } from "@/components/user/marina-chrome";
import {
  addMinutesToLocalTime,
  feetToMetres,
  formatClockTime,
  formatDay,
  formatDuration,
  formatMinorUnits,
  formatShortDay,
  todayIn,
} from "@/features/user/yachts/utils/yacht-view";
import { cx } from "@/lib/cx";
import type { Booking } from "@/services/user/booking.service";
import type { CheckoutSession } from "@/services/user/checkout.service";
import type { PublicSettings } from "@/services/user/settings.service";
import type { YachtDetail } from "@/services/user/yachts.service";

import { BODY, FRAME, MUTED } from "./checkout-ui";
import { formatCountdown } from "../hooks/use-countdown";

/*
 * The Review & Pay page: three accordions (charter, lead guest, payment), then
 * consent and the pay action, beside a compact price summary. Display only:
 * every figure comes from the backend, and nothing here books or charges.
 */

const HAIRLINE = "#e3e5e8";
const money = (amount: number, currency: string) => formatMinorUnits(amount, currency) ?? "";

// ── What is shown, from a checkout session or a booking ─────────────────────

export interface CharterView {
  yachtName: string;
  slug: string;
  image: string | null;
  location: string | null;
  cruisingArea: string | null;
  /** YYYY-MM-DD and HH:mm, local to the marina. */
  date: string;
  startTime: string;
  /** Null when the backend gives no way to know the date it ends. */
  endDate: string | null;
  endTime: string | null;
  packageName: string | null;
  durationMinutes: number | null;
  guests: number;
  /** "28m motor yacht · 4 suites · 3 crew"; null until the yacht has loaded. */
  specs: string | null;
}

const yachtFacts = (yacht: YachtDetail | undefined) => {
  const photo = yacht ? [...yacht.photos].sort((a, b) => a.sort_order - b.sort_order)[0] : null;
  return {
    image: photo?.url ?? null,
    location: yacht?.departure_city ?? null,
    cruisingArea: yacht?.cruising_regions.length ? yacht.cruising_regions.join(" · ") : null,
    specs: yacht
      ? [
          yacht.length_ft !== null
            ? `${feetToMetres(yacht.length_ft)}m ${(yacht.type ?? "yacht").toLowerCase()}`
            : yacht.type,
          yacht.suites !== null ? `${yacht.suites} ${yacht.suites === 1 ? "suite" : "suites"}` : null,
          yacht.crew.length ? `${yacht.crew.length} crew` : null,
        ]
          .filter(Boolean)
          .join(" · ") || null
      : null,
  };
};

export function charterFromSession(session: CheckoutSession, yacht?: YachtDetail): CharterView {
  const { slot } = session;
  const duration =
    yacht?.slot_types.find((type) => type.id === slot.slot_type_id)?.duration_minutes ?? null;
  const end =
    duration !== null
      ? addMinutesToLocalTime(slot.date, slot.start_time, duration)
      : slot.end_time
        ? { date: slot.end_time > slot.start_time ? slot.date : null, time: slot.end_time }
        : { date: null, time: null };
  return {
    yachtName: session.yacht.name,
    slug: session.yacht.slug,
    ...yachtFacts(yacht),
    date: slot.date,
    startTime: slot.start_time,
    endDate: end.date,
    endTime: end.time,
    packageName: slot.slot_type_name,
    durationMinutes: duration,
    guests: session.guests,
  };
}

export function charterFromBooking(booking: Booking, yacht?: YachtDetail): CharterView {
  const { slot } = booking;
  const minutes = (Date.parse(slot.ends_at) - Date.parse(slot.starts_at)) / 60_000;
  return {
    yachtName: booking.yacht.name,
    slug: booking.yacht.slug,
    ...yachtFacts(yacht),
    date: slot.date,
    startTime: slot.start_time,
    endDate: todayIn(slot.time_zone, new Date(slot.ends_at)),
    endTime: slot.end_time,
    packageName: slot.slot_type_name,
    durationMinutes: Number.isFinite(minutes) && minutes > 0 ? minutes : null,
    guests: booking.guest_count,
  };
}

export interface PriceView {
  currency: string;
  charter: number | null;
  addons: { name: string; quantity: number; amount: number }[];
  addonsTotal: number | null;
  taxable: number;
  taxLabel: string;
  taxRate: number | null;
  tax: number;
  total: number;
}

/** Null while the session cannot be priced. */
export function priceFromSession(session: CheckoutSession, taxLabel: string): PriceView | null {
  const { pricing, totals } = session;
  if (!pricing || !totals) return null;
  return {
    currency: pricing.currency,
    charter: pricing.charter_amount,
    addons: pricing.addons,
    addonsTotal: pricing.addons.length ? pricing.addons_amount : null,
    taxable: pricing.subtotal,
    taxLabel,
    taxRate: totals.tax_rate,
    tax: totals.tax_amount,
    total: totals.total_amount,
  };
}

export function priceFromBooking({ pricing }: Booking): PriceView {
  return {
    currency: pricing.currency,
    charter: pricing.charter_amount,
    addons: pricing.addons,
    addonsTotal: pricing.addons.length
      ? pricing.addons.reduce((sum, addon) => sum + addon.amount, 0)
      : null,
    taxable: pricing.subtotal,
    taxLabel: pricing.tax_label,
    taxRate: pricing.tax_rate,
    tax: pricing.tax_amount,
    total: pricing.total_amount,
  };
}

/** "Aurora · Fri, 13 Nov · 4 guests", for the closed charter section. */
export const charterSummary = (charter: CharterView) =>
  `${charter.yachtName} · ${formatShortDay(charter.date)} · ${charter.guests} ${charter.guests === 1 ? "guest" : "guests"}`;

// ── Page frame ──────────────────────────────────────────────────────────────

interface ReviewPayFrameProps {
  /** Seconds the backend still holds the charter; null hides the timer. */
  secondsLeft: number | null;
  reference?: string;
  /** Notices above the accordions (hold or price problems). */
  notices?: ReactNode;
  aside: ReactNode;
  children: ReactNode;
}

export function ReviewPayFrame({
  secondsLeft,
  reference,
  notices,
  aside,
  children,
}: ReviewPayFrameProps) {
  return (
    <div className="bg-white pb-[120px] antialiased" style={{ ...SANS, color: INK }}>
      <section
        className={cx(FRAME, "flex flex-wrap items-end justify-between gap-x-10 gap-y-6 pt-[56px]")}
      >
        <div className="min-w-0">
          <p className="text-[12px] tracking-[0.2em] uppercase" style={{ color: MUTED }}>
            Almost aboard{reference ? ` · ${reference}` : ""}
          </p>
          <h1 className="mt-[16px] text-[44px] leading-[1.02] font-normal tracking-[-1.5px] lg:text-[72px] lg:tracking-[-2.2px]">
            Review &amp; <span style={SERIF}>pay.</span>
          </h1>
        </div>
        {secondsLeft !== null && secondsLeft > 0 && (
          <p
            role="timer"
            className="flex items-center gap-[10px] border-b pb-[8px] text-[14px] leading-[20px]"
            style={{ borderColor: INK }}
          >
            <Clock aria-hidden="true" strokeWidth={1.5} className="size-4 shrink-0" />
            <span style={{ color: BODY }}>Held for you</span>
            <strong className="font-medium tabular-nums">{formatCountdown(secondsLeft)}</strong>
          </p>
        )}
      </section>

      <div
        className={cx(
          FRAME,
          "mt-[48px] grid gap-[48px] lg:mt-[64px] xl:grid-cols-[minmax(0,1fr)_minmax(0,384px)] xl:gap-[72px]",
        )}
      >
        <div className="min-w-0">
          {notices}
          {children}
        </div>
        <aside className="hidden min-w-0 xl:block">
          <div className="sticky top-[24px]">{aside}</div>
        </aside>
      </div>
    </div>
  );
}

// ── Accordion ───────────────────────────────────────────────────────────────

export type SectionKey = "charter" | "payment" | "guest";

/** Which sections are open. Several may be; content stays mounted while closed. */
export function useSections(initial: SectionKey[]) {
  const [open, setOpen] = useState<ReadonlySet<SectionKey>>(() => new Set(initial));
  const change = (update: (next: Set<SectionKey>) => void) =>
    setOpen((current) => {
      const next = new Set(current);
      update(next);
      return next;
    });
  return {
    isOpen: (key: SectionKey) => open.has(key),
    toggle: (key: SectionKey) => change((next) => (next.has(key) ? next.delete(key) : next.add(key))),
    /** Opens a section and brings it into view, e.g. to show a problem in it. */
    reveal: (key: SectionKey) => {
      change((next) => next.add(key));
      window.requestAnimationFrame(() =>
        document.getElementById(`section-${key}`)?.scrollIntoView({ behavior: "smooth" }),
      );
    },
    /** Closes one section and opens the next. */
    advance: (from: SectionKey, to: SectionKey) => {
      change((next) => {
        next.delete(from);
        next.add(to);
      });
      window.requestAnimationFrame(() =>
        document.getElementById(`section-${to}`)?.scrollIntoView({ behavior: "smooth" }),
      );
    },
  };
}

interface AccordionProps {
  id: SectionKey;
  number: string;
  title: string;
  /** One line shown while the section is closed. */
  summary?: ReactNode;
  open: boolean;
  onToggle: () => void;
  /** Something in this section needs the customer's attention. */
  attention?: boolean;
  children: ReactNode;
}

export function Accordion({
  id,
  number,
  title,
  summary,
  open,
  onToggle,
  attention = false,
  children,
}: AccordionProps) {
  const headingId = `section-${id}-heading`;
  const panelId = `section-${id}-panel`;
  return (
    <section
      id={`section-${id}`}
      className="relative scroll-mt-[24px] border-t"
      style={{ borderColor: HAIRLINE }}
    >
      {/* The open section is marked by a navy rule along its edge. */}
      <span
        aria-hidden="true"
        className={cx(
          "absolute top-[-1px] left-0 w-[2px] origin-top bg-[#0d1b2a] transition-transform duration-500 ease-out",
          open ? "h-[calc(100%+1px)] scale-y-100" : "h-[calc(100%+1px)] scale-y-0",
        )}
      />
      <h2 id={headingId} className="m-0">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="group flex w-full items-start gap-[16px] py-[28px] pr-[2px] pl-[20px] text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#0d1b2a] sm:gap-[24px] sm:pl-[32px] lg:py-[34px]"
        >
          <span
            className="mt-[9px] w-[24px] shrink-0 text-[12px] tracking-[0.18em] tabular-nums transition-colors"
            style={{ color: open ? INK : MUTED }}
          >
            {number}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[24px] leading-[34px] tracking-[-0.4px] lg:text-[30px] lg:leading-[40px]">
              {title}
            </span>
            {!open && summary && (
              <span
                className="mt-[4px] block truncate text-[14px] leading-[20px]"
                style={{ color: BODY }}
              >
                {summary}
              </span>
            )}
          </span>
          <span
            aria-hidden="true"
            className={cx(
              "relative mt-[2px] flex size-[40px] shrink-0 items-center justify-center rounded-full border transition-colors duration-300",
              open
                ? "border-[#0d1b2a] bg-[#0d1b2a] text-white"
                : "border-[#c9ccd0] group-hover:border-[#0d1b2a]",
            )}
          >
            <ChevronDown
              strokeWidth={1.5}
              className={cx("size-4 transition-transform duration-500", open && "rotate-180")}
            />
            {attention && (
              <span className="absolute -top-[2px] -right-[2px] size-[10px] rounded-full border-2 border-white bg-[#b42318]" />
            )}
          </span>
        </button>
      </h2>
      <div
        id={panelId}
        role="region"
        aria-labelledby={headingId}
        inert={!open}
        className={cx(
          "grid transition-[grid-template-rows,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="pr-[2px] pb-[44px] pl-[20px] sm:pl-[80px]">{children}</div>
        </div>
      </div>
    </section>
  );
}

/** Closes the last section with the same hairline. */
export function AccordionGroup({ children }: { children: ReactNode }) {
  return (
    <div className="border-b" style={{ borderColor: HAIRLINE }}>
      {children}
    </div>
  );
}

export function NextSectionButton({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-[32px] inline-flex items-center gap-[14px] border-b pb-[6px] text-[12px] leading-[16px] tracking-[0.18em] uppercase transition-opacity hover:opacity-70"
      style={{ borderColor: INK }}
    >
      {children}
      <ChevronDown aria-hidden="true" strokeWidth={1.5} className="size-[13px] -rotate-90" />
    </button>
  );
}

// ── 01 Your charter ─────────────────────────────────────────────────────────

const atTime = (date: string, time: string) => `${formatShortDay(date)} · ${formatClockTime(time)}`;

interface CharterDetailsProps {
  charter: CharterView;
  /** Replaces the guest count, e.g. with a stepper. */
  guestControl?: ReactNode;
  /** "Change dates", when the selection can still be changed. */
  changeHref?: Route;
}

export function CharterDetails({ charter, guestControl, changeHref }: CharterDetailsProps) {
  const facts: { label: string; value: ReactNode }[] = [
    { label: "Charter date", value: formatDay(charter.date) },
    { label: "Embark", value: atTime(charter.date, charter.startTime) },
    {
      label: "Disembark",
      value: charter.endTime
        ? charter.endDate
          ? atTime(charter.endDate, charter.endTime)
          : formatClockTime(charter.endTime)
        : "Confirmed by your captain",
    },
    ...(charter.packageName ? [{ label: "Package", value: charter.packageName }] : []),
    ...(charter.durationMinutes !== null
      ? [{ label: "Duration", value: formatDuration(charter.durationMinutes) }]
      : []),
    {
      label: "Guests",
      value: guestControl ?? `${charter.guests} ${charter.guests === 1 ? "guest" : "guests"}`,
    },
    ...(charter.cruisingArea ? [{ label: "Cruising area", value: charter.cruisingArea }] : []),
  ];

  return (
    <div>
      <div className="flex flex-col gap-[24px] sm:flex-row sm:items-stretch">
        <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-[#eef1f4] sm:aspect-auto sm:h-[156px] sm:w-[232px]">
          {charter.image && (
            // Backend photos come from signed storage URLs, so they are not optimised by Next.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={charter.image}
              alt={charter.yachtName}
              className="absolute inset-0 size-full object-cover"
            />
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-[16px]">
          <div>
            <p
              className="text-[30px] leading-[36px] tracking-[-0.6px] break-words lg:text-[36px] lg:leading-[42px]"
              style={SERIF}
            >
              {charter.yachtName}
            </p>
            {charter.location && (
              <p
                className="mt-[8px] flex items-center gap-[8px] text-[14px] capitalize"
                style={{ color: BODY }}
              >
                <MapPin aria-hidden="true" strokeWidth={1.5} className="size-4 shrink-0" />
                Departs {charter.location}
              </p>
            )}
          </div>
          {changeHref && (
            <Link
              href={changeHref}
              className="self-start border-b pb-[4px] text-[12px] leading-[16px] tracking-[0.18em] uppercase transition-opacity hover:opacity-70"
              style={{ borderColor: INK }}
            >
              Change date or package
            </Link>
          )}
        </div>
      </div>

      <dl className="mt-[32px] grid grid-cols-1 border-t sm:grid-cols-2 lg:grid-cols-3" style={{ borderColor: HAIRLINE }}>
        {facts.map((fact) => (
          <div
            key={fact.label}
            className="min-w-0 border-b py-[18px] sm:pr-[20px]"
            style={{ borderColor: HAIRLINE }}
          >
            <dt className="text-[11px] tracking-[0.18em] uppercase" style={{ color: MUTED }}>
              {fact.label}
            </dt>
            <dd className="mt-[8px] text-[16px] leading-[24px] break-words">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// ── 02 Payment ──────────────────────────────────────────────────────────────

const taxName = (price: PriceView) =>
  price.taxRate === null ? price.taxLabel : `${price.taxLabel} (${price.taxRate}%)`;

/**
 * What the customer pays, exactly as the backend priced it. The backend charges
 * the booking's full total, so the amount payable today is that total. Razorpay
 * offers the payment methods in its own window.
 */
export function PaymentSummary({ price }: { price: PriceView }) {
  const row = (label: string, amount: number, muted = false) => (
    <div key={label} className="flex items-baseline justify-between gap-6 py-[9px]">
      <dt className="min-w-0" style={{ color: muted ? MUTED : BODY }}>
        {label}
      </dt>
      <dd className="shrink-0 tabular-nums">{money(amount, price.currency)}</dd>
    </div>
  );

  return (
    <div className="max-w-[640px]">
      <dl className="text-[15px] leading-[22px]">
        {price.charter !== null && row("Charter", price.charter)}
        {price.addons.map((addon) =>
          row(addon.quantity > 1 ? `${addon.name} × ${addon.quantity}` : addon.name, addon.amount, true),
        )}
        {price.addonsTotal !== null && row("Add-ons", price.addonsTotal)}
        <div className="my-[6px] border-t" style={{ borderColor: HAIRLINE }} />
        {row("Taxable amount", price.taxable)}
        {row(taxName(price), price.tax)}
      </dl>
      <div className="mt-[10px] flex items-baseline justify-between gap-6 border-t pt-[18px]" style={{ borderColor: INK }}>
        <p className="text-[16px]">Total charter amount</p>
        <p className="text-[22px] leading-[28px] tabular-nums">{money(price.total, price.currency)}</p>
      </div>
      <div className="mt-[24px] flex flex-wrap items-center justify-between gap-x-6 gap-y-2 bg-[#0d1b2a] px-[24px] py-[22px] text-white">
        <div>
          <p className="text-[12px] tracking-[0.2em] text-white/70 uppercase">Payable today</p>
          <p className="mt-[4px] text-[13px] leading-[19px] text-white/70">
            Including {price.taxLabel}. Nothing more to pay later.
          </p>
        </div>
        <p className="text-[30px] leading-[36px] tabular-nums">{money(price.total, price.currency)}</p>
      </div>
    </div>
  );
}

// ── Navy booking card ───────────────────────────────────────────────────────

interface BookingCardProps {
  charter: CharterView;
  price: PriceView | null;
  settings: PublicSettings | undefined;
  /** Shown instead of the figures while there are none. */
  unavailable?: ReactNode;
  /** The same pay action as the main button. Left out where that button is close by. */
  pay?: { label: string; disabled: boolean; onPay: () => void };
}

const looksLikePhone = (value: string | null | undefined): value is string =>
  Boolean(value && /^\+?[\d\s()-]{7,}$/.test(value));

/** The dark navy summary beside the accordions: the yacht, its dates and what is payable. */
export function BookingCard({ charter, price, settings, unavailable, pay }: BookingCardProps) {
  const dates =
    charter.endDate && charter.endDate !== charter.date
      ? `${formatShortDay(charter.date)} – ${formatShortDay(charter.endDate)}`
      : formatShortDay(charter.date);
  const facts: [string, string][] = [
    ["Dates", dates],
    ["Embark", formatClockTime(charter.startTime)],
    ...(charter.durationMinutes !== null
      ? ([["Duration", formatDuration(charter.durationMinutes)]] as [string, string][])
      : []),
    ["Guests", String(charter.guests)],
    ...(charter.cruisingArea ? ([["Route", charter.cruisingArea]] as [string, string][]) : []),
  ];
  const phone = looksLikePhone(settings?.contact_phone) ? settings.contact_phone : null;
  const email = settings?.contact_email ?? null;
  const line = (label: string, value: string, strong = false) => (
    <div key={label} className="flex items-baseline justify-between gap-6 py-[5px]">
      <dt className={strong ? "text-white" : "text-white/65"}>{label}</dt>
      <dd className="min-w-0 text-right break-words tabular-nums">{value}</dd>
    </div>
  );

  return (
    <div className="bg-[#0b1a2e] text-white">
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#13243a]">
        {charter.image && (
          // Backend photos come from signed storage URLs, so they are not optimised by Next.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={charter.image} alt={charter.yachtName} className="absolute inset-0 size-full object-cover" />
        )}
        {(charter.location || charter.cruisingArea) && (
          <span className="absolute bottom-[14px] left-[14px] max-w-[calc(100%-28px)] truncate bg-white px-[10px] py-[5px] text-[12px] capitalize" style={{ color: INK }}>
            {[charter.location, charter.cruisingArea?.split(" · ")[0]].filter(Boolean).join(" · ")}
          </span>
        )}
      </div>

      <div className="px-[24px] pt-[26px] pb-[28px] sm:px-[28px]">
        <p className="text-[30px] leading-[36px] tracking-[-0.6px] break-words">{charter.yachtName}</p>
        {charter.specs && <p className="mt-[6px] text-[13px] leading-[19px] text-white/65">{charter.specs}</p>}

        <dl className="mt-[24px] border-b border-white/15 pb-[16px] text-[14px] leading-[20px]">
          {facts.map(([label, value]) => line(label, value))}
        </dl>

        {price ? (
          <>
            <dl className="border-b border-white/15 py-[16px] text-[14px] leading-[20px]">
              {line(price.addonsTotal !== null ? "Charter and add-ons" : "Charter", money(price.taxable, price.currency))}
              {line(taxName(price), money(price.tax, price.currency))}
            </dl>
            <div className="flex items-baseline justify-between gap-6 py-[18px]">
              <p className="text-[17px]">Charter total</p>
              <p className="text-[22px] leading-[28px] tabular-nums">{money(price.total, price.currency)}</p>
            </div>
            <div className="bg-[#13243a] px-[20px] py-[18px]">
              <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
                <p className="text-[12px] leading-[16px] tracking-[0.18em] text-[#8fc0f2] uppercase">
                  Payable today
                </p>
                <p className="text-[32px] leading-[36px] tracking-[-0.6px] tabular-nums">
                  {money(price.total, price.currency)}
                </p>
              </div>
              <p className="mt-[10px] text-[12px] leading-[17px] text-white/65">
                Including {price.taxLabel}. Nothing more to pay later.
              </p>
            </div>
          </>
        ) : (
          <div className="py-[18px] text-[14px] leading-[21px] text-white/80">{unavailable}</div>
        )}

        {pay && (
          <button
            type="button"
            disabled={pay.disabled}
            onClick={pay.onPay}
            className="mt-[20px] inline-flex min-h-[54px] w-full items-center justify-center gap-[12px] px-[20px] text-[12px] leading-[16px] tracking-[0.18em] text-[#0d1b2a] uppercase transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: "linear-gradient(90deg, #f4f8fd 0%, #cfe2f8 45%, #69aef0 100%)" }}
          >
            <Lock aria-hidden="true" strokeWidth={1.5} className="size-[14px] shrink-0" />
            {pay.label}
          </button>
        )}

        <p className="mt-[18px] text-[12px] leading-[18px] text-white/65">
          Payments are processed securely by Razorpay, where you choose how to pay. Your card and
          bank details never reach Sithara Marina.
        </p>
        {(phone || email) && (
          <p className="mt-[18px] border-t border-white/15 pt-[18px] text-[13px] leading-[19px] text-white/80">
            Questions before you pay?{" "}
            {phone ? (
              <>
                Call{" "}
                <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className="text-white underline underline-offset-2">
                  {phone}
                </a>
              </>
            ) : (
              <>
                Write to{" "}
                <a href={`mailto:${email}`} className="text-white underline underline-offset-2">
                  {email}
                </a>
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Consent ─────────────────────────────────────────────────────────────────

interface ConsentProps {
  terms: boolean;
  policy: boolean;
  onTermsChange: (value: boolean) => void;
  onPolicyChange: (value: boolean) => void;
  settings: PublicSettings | undefined;
  /** After booking: already given, shown checked and fixed. */
  locked?: boolean;
  showError?: boolean;
}

export function Consent({
  terms,
  policy,
  onTermsChange,
  onPolicyChange,
  settings,
  locked = false,
  showError = false,
}: ConsentProps) {
  const [reading, setReading] = useState<"terms" | "policy" | null>(null);
  const contact = settings?.contact_email;
  const askConcierge = (
    <>
      Ask our concierge{contact ? (
        <>
          {" "}
          at{" "}
          <a href={`mailto:${contact}`} className="underline underline-offset-2">
            {contact}
          </a>
        </>
      ) : null}{" "}
      for a copy before you pay.
    </>
  );
  const linkButton = (key: "terms" | "policy", label: string) => (
    <button
      type="button"
      aria-expanded={reading === key}
      onClick={() => setReading(reading === key ? null : key)}
      className="underline underline-offset-2 hover:opacity-70"
    >
      {label}
    </button>
  );
  const item = (
    checked: boolean,
    onChange: (value: boolean) => void,
    label: ReactNode,
    detail: ReactNode,
    open: boolean,
  ) => (
    <div className="py-[16px]">
      <label className="flex items-start gap-[14px] text-[15px] leading-[24px]">
        <input
          type="checkbox"
          checked={checked}
          disabled={locked}
          required
          aria-invalid={showError && !checked}
          onChange={(event) => onChange(event.currentTarget.checked)}
          className="mt-[4px] size-[16px] shrink-0 accent-[#0d1b2a]"
        />
        <span className="min-w-0 flex-1">
          {label}{" "}
          <span className="ml-[6px] text-[11px] tracking-[0.18em] whitespace-nowrap uppercase" style={{ color: MUTED }}>
            Required
          </span>
        </span>
      </label>
      {open && (
        <div className="mt-[12px] ml-[30px] border-l-2 pl-[16px] text-[14px] leading-[22px] whitespace-pre-line" style={{ borderColor: HAIRLINE, color: BODY }}>
          {detail}
        </div>
      )}
    </div>
  );

  return (
    <div className="mt-[48px]">
      <p className="text-[12px] tracking-[0.2em] uppercase" style={{ color: MUTED }}>
        Before you pay
      </p>
      <div className="mt-[8px] divide-y divide-[#e3e5e8]">
        {item(
          terms,
          onTermsChange,
          <>I agree to the {linkButton("terms", "charter terms and conditions")}.</>,
          <>The full charter terms are being published. {askConcierge}</>,
          reading === "terms",
        )}
        {item(
          policy,
          onPolicyChange,
          <>I have read the {linkButton("policy", "cancellation policy")}.</>,
          settings?.cancellation_summary ? (
            settings.cancellation_summary
          ) : (
            <>The cancellation policy is being published. {askConcierge}</>
          ),
          reading === "policy",
        )}
      </div>
      {locked ? (
        <p className="mt-[4px] flex items-center gap-[8px] text-[14px]" style={{ color: BODY }}>
          <Check aria-hidden="true" strokeWidth={1.5} className="size-4" />
          Accepted when your booking was created.
        </p>
      ) : (
        showError &&
        (!terms || !policy) && (
          <p role="alert" className="mt-[4px] text-[14px] leading-[20px] text-[#b42318]">
            Please accept the charter terms and the cancellation policy to continue.
          </p>
        )
      )}
      <p className="mt-[16px] text-[14px] leading-[21px]" style={{ color: MUTED }}>
        A GST tax invoice is prepared for every confirmed booking. You can download it from your
        confirmation page.
      </p>
    </div>
  );
}

// ── Pay action ──────────────────────────────────────────────────────────────

export const payButtonClass =
  "inline-flex min-h-[58px] w-full items-center justify-center gap-[14px] bg-[#0d1b2a] px-[28px] text-[12px] leading-[16px] tracking-[0.2em] text-white uppercase transition-colors hover:bg-[#1c3350] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0d1b2a] disabled:cursor-not-allowed disabled:bg-[#0d1b2a]/45 disabled:hover:bg-[#0d1b2a]/45";

interface PayActionProps {
  price: PriceView | null;
  label: string;
  disabled: boolean;
  onPay: () => void;
  /** Errors and progress, above the button. */
  status?: ReactNode;
  /** Quiet secondary action under the button. */
  secondary?: ReactNode;
}

/**
 * The final summary and the pay button. On phones and tablets a slim copy stays
 * pinned to the bottom of the screen until this block scrolls into view.
 */
export function PayAction({ price, label, disabled, onPay, status, secondary }: PayActionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(true);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setInView(Boolean(entry?.isIntersecting)));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const amount = price ? money(price.total, price.currency) : null;

  return (
    <>
      <div ref={ref} className="mt-[40px] border-t pt-[32px]" style={{ borderColor: INK }}>
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
          <div>
            <p className="text-[12px] tracking-[0.2em] uppercase" style={{ color: MUTED }}>
              Payable today
            </p>
            <p className="mt-[6px] text-[36px] leading-[42px] tracking-[-0.8px] tabular-nums">
              {amount ?? "—"}
            </p>
          </div>
          {price && (
            <p className="text-[14px] leading-[20px]" style={{ color: BODY }}>
              Includes {money(price.tax, price.currency)} {price.taxLabel}
            </p>
          )}
        </div>
        <div aria-live="polite">{status}</div>
        <div className="mt-[24px] max-w-[520px]">
          <button type="button" disabled={disabled} onClick={onPay} className={payButtonClass}>
            <Lock aria-hidden="true" strokeWidth={1.5} className="size-[14px] shrink-0" />
            {label}
          </button>
          <p className="mt-[12px] text-[13px] leading-[19px]" style={{ color: MUTED }}>
            You’ll choose how to pay in Razorpay’s secure window. Your booking is confirmed only
            once we have verified the payment.
          </p>
          {secondary}
        </div>
      </div>

      {!inView && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-white/95 px-5 py-[12px] backdrop-blur xl:hidden" style={{ borderColor: HAIRLINE }}>
          <div className="mx-auto flex max-w-[720px] items-center justify-between gap-[16px]">
            <div className="min-w-0">
              <p className="text-[11px] tracking-[0.18em] uppercase" style={{ color: MUTED }}>
                Payable today
              </p>
              <p className="text-[18px] leading-[24px] tabular-nums">{amount ?? "—"}</p>
            </div>
            <button
              type="button"
              onClick={() => ref.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
              className={cx(payButtonClass, "w-auto min-h-[48px] px-[20px]")}
            >
              Proceed to payment
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** Problems above the pay button. */
export function PayNotice({ children, tone = "alert" }: { children: ReactNode; tone?: "alert" | "info" }) {
  return (
    <p
      role={tone === "alert" ? "alert" : undefined}
      className={cx(
        "mt-[20px] border-l-2 pl-[14px] text-[15px] leading-[23px]",
        tone === "alert" ? "border-[#b42318]" : "border-[#0d1b2a]",
      )}
      style={{ color: BODY }}
    >
      {children}
    </p>
  );
}
