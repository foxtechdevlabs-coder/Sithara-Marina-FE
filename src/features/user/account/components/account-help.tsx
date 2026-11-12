"use client";

import { ArrowRight, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent, type ReactNode } from "react";

import { SERIF } from "@/components/user/marina-chrome";
import { userRoutes } from "@/constants/routes";
import { useApiQuery } from "@/hooks/use-api-query";
import { cx } from "@/lib/cx";
import { listMyBookings, type CustomerBooking } from "@/services/user/customer-bookings.service";
import {
  sendSupportMessage,
  SUPPORT_MESSAGE_MAX,
  SUPPORT_TOPICS,
  type SupportTopic,
} from "@/services/user/support.service";

import { todayInKerala } from "../utils/account-format";

import {
  AccountHeading,
  Card,
  CardTitle,
  fieldErrorClass,
  inputClass,
  labelClass,
  MetaLines,
  primaryButtonClass,
  primaryButtonStyle,
} from "./account-ui";
import { QueryFallback } from "./query-fallback";

const CONCIERGE_PHONE = { label: "+91 97245 53452", href: "tel:+919724553452" };
const CONCIERGE_EMAIL = "sitharamarina@gmail.com";

const FAQS: readonly { question: string; answer: string }[] = [
  {
    question: "Where are my boarding instructions?",
    answer: "Open your confirmed booking to review your itinerary and arrival arrangements.",
  },
  {
    question: "How do I request a cancellation?",
    answer:
      "Open the relevant booking and review its cancellation policy before sending a request.",
  },
  {
    question: "Where can I find my invoice?",
    answer: "Your invoice is available from the payment section of the relevant booking.",
  },
];

/**
 * Figma C56 "A little help, personally given.": the concierge's details, a
 * message form tied to a journey, and answers to common questions.
 */
export function AccountHelp({ bookingId }: { bookingId?: string }) {
  const query = useApiQuery(listMyBookings, "help-bookings");

  return (
    <>
      <AccountHeading
        heading="A little help,"
        headingSerif="personally given."
        subtitle="Your concierge is here for the details before, during and after your charter."
      />

      <Card title="Speak to our concierge" className="mt-8 lg:mt-10">
        <div className="mt-3 space-y-1 text-[11px] leading-[1.5] text-body sm:text-[12px]">
          <p>
            <a href={CONCIERGE_PHONE.href} className="hover:underline">
              {CONCIERGE_PHONE.label}
            </a>
          </p>
          <p>
            <a href={`mailto:${CONCIERGE_EMAIL}`} className="break-all hover:underline">
              {CONCIERGE_EMAIL}
            </a>
          </p>
        </div>
        <MetaLines
          className="mt-4"
          lines={[
            "Keep your booking or enquiry reference close so we can help with the right journey.",
          ]}
        />
      </Card>

      {query.data ? (
        <HelpForm bookings={query.data} initialBookingId={bookingId} />
      ) : (
        <QueryFallback query={query} loadingLabel="Loading your journeys" />
      )}

      <section aria-labelledby="help-details" className="mt-12 lg:mt-14">
        <h2
          id="help-details"
          className="text-navy-ink text-[1.75rem] leading-tight font-normal tracking-[-0.02em] lg:text-[2.25rem]"
        >
          A few helpful{" "}
          <span className="tracking-[-0.01em]" style={SERIF}>
            details.
          </span>
        </h2>
        <ul className="mt-6 space-y-5 lg:mt-7">
          {FAQS.map((faq) => (
            <li key={faq.question}>
              <Card as="article" className="sm:py-8">
                <CardTitle className="text-[1.25rem] lg:text-[1.375rem]">{faq.question}</CardTitle>
                <MetaLines lines={[faq.answer]} />
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

type FieldErrors = Partial<Record<"topic" | "message", string>>;
type Status = { kind: "idle" } | { kind: "sending" } | { kind: "failed" };

function SelectField({
  id,
  label,
  error,
  children,
  ...select
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
  value: string;
  required?: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={select.value}
          required={select.required}
          disabled={select.disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => select.onChange(event.target.value)}
          className={cx(inputClass, "appearance-none truncate pr-11 invalid:text-navy-ink/60")}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          strokeWidth={1.5}
          className="text-navy-ink pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2"
        />
      </div>
      {error ? (
        <p id={`${id}-error`} className={fieldErrorClass}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** The journey preselected: the one asked about, else the next upcoming charter. */
function defaultJourney(bookings: readonly CustomerBooking[], requested?: string): string {
  if (requested && bookings.some((booking) => booking.id === requested)) return requested;
  const today = todayInKerala();
  const next = [...bookings]
    .filter((booking) => booking.date >= today && booking.status === "confirmed")
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  return next?.id ?? "";
}

function HelpForm({
  bookings,
  initialBookingId,
}: {
  bookings: readonly CustomerBooking[];
  initialBookingId?: string;
}) {
  const id = useId();
  const router = useRouter();
  const [journey, setJourney] = useState(() => defaultJourney(bookings, initialBookingId));
  const [topic, setTopic] = useState<SupportTopic | "">("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const isSending = status.kind === "sending";
  const journeys = [...bookings].sort((a, b) => b.date.localeCompare(a.date));

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found: FieldErrors = {};
    if (!topic) found.topic = "Please choose what we can help with.";
    if (!message.trim()) found.message = "Please tell us what you would like help with.";
    else if (message.length > SUPPORT_MESSAGE_MAX)
      found.message = `Please keep your message under ${SUPPORT_MESSAGE_MAX} characters.`;
    setErrors(found);
    if (Object.keys(found).length > 0 || !topic) {
      document.getElementById(`${id}-${found.topic ? "topic" : "message"}`)?.focus();
      return;
    }

    setStatus({ kind: "sending" });
    try {
      const sent = await sendSupportMessage({
        booking_id: journey || null,
        topic,
        message: message.trim(),
      });
      router.push(userRoutes.accountHelpSent(sent.reference));
    } catch {
      setStatus({ kind: "failed" });
    }
  };

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      noValidate
      aria-label="Message our concierge"
      className="mt-8"
    >
      <div className="grid max-w-[53.5rem] gap-x-5 gap-y-7 sm:grid-cols-2 lg:gap-y-10">
        <SelectField
          id={`${id}-journey`}
          label="Related journey"
          value={journey}
          disabled={isSending}
          onChange={setJourney}
        >
          {journeys.map((booking) => (
            <option key={booking.id} value={booking.id}>
              {booking.reference} · {booking.yacht.name}
            </option>
          ))}
          <option value="">Not about a specific journey</option>
        </SelectField>

        <SelectField
          id={`${id}-topic`}
          label="How can we help? *"
          value={topic}
          required
          disabled={isSending}
          error={errors.topic}
          onChange={(value) => {
            setTopic(value as SupportTopic);
            setErrors((current) => ({ ...current, topic: undefined }));
          }}
        >
          <option value="" disabled>
            Booking / arrival / billing / other
          </option>
          {SUPPORT_TOPICS.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </SelectField>

        <div>
          <label htmlFor={`${id}-message`} className={labelClass}>
            Your message *
          </label>
          <textarea
            id={`${id}-message`}
            value={message}
            rows={1}
            required
            disabled={isSending}
            placeholder="Tell us what you would like help with."
            aria-invalid={errors.message ? true : undefined}
            aria-describedby={errors.message ? `${id}-message-error` : undefined}
            onChange={(event) => {
              setMessage(event.target.value);
              setErrors((current) => ({ ...current, message: undefined }));
            }}
            className={cx(inputClass, "h-auto min-h-[55px] resize-y py-4 leading-snug")}
          />
          {errors.message ? (
            <p id={`${id}-message-error`} className={fieldErrorClass}>
              {errors.message}
            </p>
          ) : null}
        </div>
      </div>

      {status.kind === "failed" ? (
        <p role="alert" className={fieldErrorClass}>
          We couldn’t send your message just now. Please try again, or call us on{" "}
          {CONCIERGE_PHONE.label}.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSending}
        className={cx(primaryButtonClass, "mt-10 lg:mt-11")}
        style={primaryButtonStyle}
      >
        {isSending ? "Sending…" : "Send to our concierge"}
        <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
      </button>
    </form>
  );
}
