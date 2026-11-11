"use client";

import { Check, X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

import { INK, SANS, SERIF } from "@/components/user/marina-chrome";
import { BODY, FRAME, MUTED } from "@/features/user/checkout/components/checkout-ui";
import type { CharterView } from "@/features/user/checkout/components/review-pay";
import {
  formatClockTime,
  formatDay,
  formatDuration,
} from "@/features/user/yachts/utils/yacht-view";
import { cx } from "@/lib/cx";

/*
 * The dedicated screen shown once payment starts. Display only: which state it
 * shows is decided by the payment step from the backend's answers, and only the
 * backend's booking status can make it say "confirmed".
 */

export type ProcessingKind =
  | "initiating" // POST /payments and the SDK are loading
  | "window" // Razorpay's window is open over this screen
  | "verifying" // Razorpay reported success: the backend is checking it
  | "checking" // the window closed: one status read
  | "pending" // the backend has not decided yet; polling, or it ran out of time
  | "confirmed" // GET /bookings/{id}(/status) says confirmed
  | "failed" // the backend or Razorpay says this attempt failed
  | "cancelled" // closed without paying, or the attempt was cancelled
  | "unconfirmed" // the wait ended without a final answer
  | "review"
  | "expired"
  | "closed";

type Tone = "working" | "success" | "problem" | "info";

interface Copy {
  status: string;
  heading: string;
  headingSerif: string;
  description: string;
  tone: Tone;
}

const COPY: Record<ProcessingKind, Copy> = {
  initiating: {
    status: "Preparing",
    heading: "Preparing your",
    headingSerif: "secure payment.",
    description: "Please wait while we connect to the payment provider.",
    tone: "working",
  },
  window: {
    status: "Awaiting payment",
    heading: "Complete your",
    headingSerif: "payment.",
    description:
      "Razorpay’s secure window is open. Choose how to pay there; we’ll take it from here.",
    tone: "working",
  },
  verifying: {
    status: "Verifying",
    heading: "Verifying your",
    headingSerif: "payment.",
    description: "Your payment has been received. We are confirming your booking.",
    tone: "working",
  },
  checking: {
    status: "Processing",
    heading: "Processing your",
    headingSerif: "payment.",
    description: "Please wait while we securely verify your payment.",
    tone: "working",
  },
  pending: {
    status: "Pending confirmation",
    heading: "Your payment is",
    headingSerif: "being processed.",
    description:
      "We are waiting for confirmation. Please do not attempt another payment while the current payment is processing.",
    tone: "info",
  },
  confirmed: {
    status: "Confirmed",
    heading: "Your booking is",
    headingSerif: "confirmed.",
    description: "We look forward to welcoming you aboard.",
    tone: "success",
  },
  failed: {
    status: "Payment unsuccessful",
    heading: "Payment",
    headingSerif: "unsuccessful.",
    description:
      "Your payment could not be completed. You can try again or check your booking details.",
    tone: "problem",
  },
  cancelled: {
    status: "Payment cancelled",
    heading: "Payment",
    headingSerif: "cancelled.",
    description: "You haven’t been charged. You can try again when you’re ready.",
    tone: "info",
  },
  unconfirmed: {
    status: "Not yet confirmed",
    heading: "We couldn’t confirm your",
    headingSerif: "payment yet.",
    description:
      "Your payment is taking a bit longer to process. Please check your dashboard or email for updates shortly.",
    tone: "info",
  },
  review: {
    status: "Under review",
    heading: "Your payment requires",
    headingSerif: "additional verification.",
    description:
      "Our team will review the transaction and contact you. Please do not pay again.",
    tone: "info",
  },
  expired: {
    status: "Hold expired",
    heading: "Your booking hold has",
    headingSerif: "expired.",
    description: "Please select an available charter date and time again.",
    tone: "problem",
  },
  closed: {
    status: "Not payable",
    heading: "This booking can’t be",
    headingSerif: "paid for.",
    description: "It is no longer waiting for payment.",
    tone: "problem",
  },
};

/** States where the customer must stay put while something is in flight. */
const STAY = new Set<ProcessingKind>(["initiating", "window", "verifying", "checking"]);

function StatusMark({ tone }: { tone: Tone }) {
  if (tone === "success") {
    return (
      <span className="flex size-[64px] animate-[processing-pop_500ms_ease-out] items-center justify-center rounded-full bg-[#0d1b2a] text-white">
        <Check aria-hidden="true" strokeWidth={1.5} className="size-[28px]" />
      </span>
    );
  }
  if (tone === "problem") {
    return (
      <span className="flex size-[64px] items-center justify-center rounded-full border border-[#b42318] text-[#b42318]">
        <X aria-hidden="true" strokeWidth={1.5} className="size-[26px]" />
      </span>
    );
  }
  // A thin navy arc turning slowly on a hairline ring: present, never hurried.
  return (
    <span aria-hidden="true" className="relative block size-[64px]">
      <svg viewBox="0 0 64 64" className="absolute inset-0 size-full">
        <circle cx="32" cy="32" r="30" fill="none" stroke="#e3e5e8" strokeWidth="1.5" />
      </svg>
      <svg
        viewBox="0 0 64 64"
        className={cx(
          "absolute inset-0 size-full",
          tone === "working" ? "animate-[spin_1.6s_linear_infinite]" : "animate-[spin_3.2s_linear_infinite]",
        )}
      >
        <circle
          cx="32"
          cy="32"
          r="30"
          fill="none"
          stroke="#0d1b2a"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="48 140"
        />
      </svg>
      <span className="absolute inset-[24px] rounded-full bg-[#0d1b2a]/90 animate-[processing-breathe_2.4s_ease-in-out_infinite]" />
    </span>
  );
}

export interface ProcessingBooking {
  charter: CharterView;
  reference: string;
  /** Formatted, from the backend. */
  amount: string;
}

interface PaymentProcessingProps {
  kind: ProcessingKind;
  booking: ProcessingBooking;
  /** Replaces the description, e.g. the reason a payment failed. */
  detail?: string | null;
  /** An extra line, e.g. the timeout message or a status-check error. */
  notice?: ReactNode;
  actions?: ReactNode;
  /** The beige aside under the actions. */
  note?: { title: string; body: ReactNode } | null;
}

export function PaymentProcessing({
  kind,
  booking,
  detail,
  notice,
  actions,
  note,
}: PaymentProcessingProps) {
  const copy = COPY[kind];
  const { charter } = booking;
  // This screen replaces the review page: start at its top.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);
  const amountLabel =
    kind === "confirmed" ? "Amount paid" : kind === "verifying" ? "Amount being paid" : "Amount payable";
  const rows: [string, string][] = [
    ["Booking reference", booking.reference],
    ["Charter date", `${formatDay(charter.date)} · ${formatClockTime(charter.startTime)}`],
    ...(charter.durationMinutes !== null
      ? ([[
          "Package",
          `${charter.packageName ? `${charter.packageName} · ` : ""}${formatDuration(charter.durationMinutes)}`,
        ]] as [string, string][])
      : charter.packageName
        ? ([["Package", charter.packageName]] as [string, string][])
        : []),
    ["Guests", String(charter.guests)],
    [amountLabel, booking.amount],
  ];

  return (
    <div className="bg-white pb-[120px] antialiased" style={{ ...SANS, color: INK }}>
      <style>{`
        @keyframes processing-breathe { 0%, 100% { transform: scale(0.55); opacity: .35 } 50% { transform: scale(1); opacity: .9 } }
        @keyframes processing-pop { 0% { transform: scale(.6); opacity: 0 } 70% { transform: scale(1.06) } 100% { transform: scale(1); opacity: 1 } }
        @media (prefers-reduced-motion: reduce) { [class*="animate-"] { animation: none !important } }
      `}</style>
      <section className={cx(FRAME, "pt-[48px] lg:pt-[72px]")}>
        <div className="max-w-[880px]" aria-live="polite">
          <p className="text-[12px] tracking-[0.2em] uppercase" style={{ color: MUTED }}>
            Sithara Marina · Secure payment
          </p>

          <div className="mt-[32px] flex flex-col gap-[28px] sm:flex-row sm:items-center sm:gap-[36px]">
            <StatusMark tone={copy.tone} />
            <h1 className="text-[40px] leading-[1.06] font-normal tracking-[-1.4px] lg:text-[60px] lg:tracking-[-2px]">
              {copy.heading} <span style={SERIF}>{copy.headingSerif}</span>
            </h1>
          </div>

          <p className="mt-[24px] max-w-[620px] text-[17px] leading-[28px]" style={{ color: BODY }}>
            {detail ?? copy.description}
            {STAY.has(kind) && (
              <span className="mt-[6px] block" style={{ color: INK }}>
                Do not close or refresh this page.
              </span>
            )}
          </p>

          <p
            className={cx(
              "mt-[24px] inline-flex items-center gap-[10px] px-[14px] py-[7px] text-[12px] tracking-[0.16em] uppercase",
              copy.tone === "success"
                ? "bg-[#0d1b2a] text-white"
                : copy.tone === "problem"
                  ? "bg-[#fbeceb] text-[#912018]"
                  : "bg-[#f3efe6] text-[#5b5244]",
            )}
          >
            <span
              aria-hidden="true"
              className={cx(
                "size-[6px] rounded-full",
                copy.tone === "success" ? "bg-white" : copy.tone === "problem" ? "bg-[#b42318]" : "bg-[#a08a5c]",
                copy.tone === "working" && "animate-pulse",
              )}
            />
            {copy.status}
          </p>

          {notice && (
            <p className="mt-[20px] max-w-[620px] border-l-2 border-[#0d1b2a] pl-[14px] text-[15px] leading-[23px]" style={{ color: BODY }}>
              {notice}
            </p>
          )}

          <div className="mt-[40px] flex flex-col border sm:flex-row" style={{ borderColor: "#e3e5e8" }}>
            <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-[#eef1f4] sm:aspect-auto sm:w-[240px]">
              {charter.image && (
                // Backend photos come from signed storage URLs, so they are not optimised by Next.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={charter.image} alt={charter.yachtName} className="absolute inset-0 size-full object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1 p-[24px] sm:p-[28px]">
              <p className="text-[18px] leading-[26px]">
                {kind === "confirmed" ? "Your charter" : "Please keep this reference."}
              </p>
              <p className="mt-[4px] text-[26px] leading-[32px] break-words" style={SERIF}>
                {charter.yachtName}
              </p>
              <dl className="mt-[16px] grid gap-x-[28px] text-[14px] leading-[20px] sm:grid-cols-2">
                {rows.map(([label, value]) => (
                  <div key={label} className="flex min-w-0 justify-between gap-4 border-t py-[10px] sm:block" style={{ borderColor: "#eef0f2" }}>
                    <dt className="text-[11px] tracking-[0.16em] uppercase" style={{ color: MUTED }}>
                      {label}
                    </dt>
                    <dd className="text-right break-words tabular-nums sm:mt-[4px] sm:text-left sm:text-[15px]">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {actions && <div className="mt-[36px] flex flex-wrap gap-[14px]">{actions}</div>}

          {note && (
            <div className="mt-[40px] bg-[#f6f3ec] px-[24px] py-[20px] sm:px-[28px]">
              <p className="text-[11px] tracking-[0.2em] text-[#7a6a4c] uppercase">{note.title}</p>
              <p className="mt-[8px] text-[14px] leading-[22px]" style={{ color: BODY }}>
                {note.body}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/** Buttons for this screen, in the site's two styles. */
export const processingPrimaryClass =
  "inline-flex min-h-[54px] items-center justify-center gap-[12px] px-[26px] text-[12px] leading-[16px] tracking-[0.18em] text-[#0d1b2a] uppercase transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0d1b2a] disabled:cursor-not-allowed disabled:opacity-50";
export const processingPrimaryStyle = {
  background: "linear-gradient(90deg, #f4f8fd 0%, #cfe2f8 45%, #69aef0 100%)",
};
export const processingSecondaryClass =
  "inline-flex min-h-[54px] items-center justify-center px-[26px] text-[12px] leading-[16px] tracking-[0.18em] uppercase border border-[#0d1b2a] text-[#0d1b2a] transition-colors hover:bg-[#0d1b2a] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0d1b2a] disabled:cursor-not-allowed disabled:opacity-50";
