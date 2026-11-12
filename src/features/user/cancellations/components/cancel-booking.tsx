"use client";

import { ArrowRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";

import {
  AccountHeading,
  AccountNotice,
  buttonRowClass,
  Card,
  darkButtonClass,
  fieldErrorClass,
  inputClass,
  labelClass,
  MetaLines,
  secondaryButtonClass,
} from "@/features/user/account/components/account-ui";
import { QueryFallback } from "@/features/user/account/components/query-fallback";
import {
  formatAmount,
  formatLongDate,
  formatTimeRange,
  guests,
  todayInKerala,
} from "@/features/user/account/utils/account-format";
import { isUpcoming } from "@/features/user/customer-bookings/utils/booking-view";
import { userRoutes } from "@/constants/routes";
import { useApiQuery } from "@/hooks/use-api-query";
import {
  CANCELLATION_REASONS,
  listMyCancellations,
  requestCancellation,
  type Cancellation,
} from "@/services/user/cancellations.service";
import { getMyBooking, type CustomerBooking } from "@/services/user/customer-bookings.service";

const NOTE_MAX = 1000;

async function loadBooking(bookingId: string, signal: AbortSignal) {
  const [booking, cancellations] = await Promise.all([
    getMyBooking(bookingId, signal),
    listMyCancellations(signal),
  ]);
  return {
    booking,
    cancellation: cancellations.find((item) => item.booking_id === bookingId) ?? null,
  };
}

const requestHeading = (reference: string) => ({
  heading: "A change",
  headingSerif: "of plans.",
  subtitle: `Request a cancellation for ${reference}. We will guide you through the next step.`,
});

/**
 * Figma C21 "A change of plans." (the booking, its policy and the reason),
 * then C31 "Before you send your request." to confirm it.
 */
export function CancelBooking({ bookingId }: { bookingId: string }) {
  const query = useApiQuery((signal) => loadBooking(bookingId, signal), bookingId);

  if (!query.data) {
    return (
      <>
        <AccountHeading {...requestHeading(bookingId)} />
        <QueryFallback
          query={query}
          loadingLabel="Loading your booking"
          notFoundMessage="We couldn’t find this booking in your account."
        />
      </>
    );
  }

  return <CancelBookingBody {...query.data} />;
}

type Step =
  | { kind: "edit" }
  | { kind: "review" }
  | { kind: "submitting" }
  | { kind: "error"; message: string };

function CancelBookingBody({
  booking,
  cancellation,
}: {
  booking: CustomerBooking;
  cancellation: Cancellation | null;
}) {
  const router = useRouter();
  const formId = useId();
  const [reason, setReason] = useState<string>(CANCELLATION_REASONS[0]);
  const [note, setNote] = useState("");
  const [step, setStep] = useState<Step>({ kind: "edit" });
  const isCancellable = booking.can_cancel && isUpcoming(booking, todayInKerala());
  const noteError =
    note.length > NOTE_MAX ? `Please keep the note under ${NOTE_MAX} characters.` : null;

  const summary = (
    <Card as="div" className="mt-8 lg:mt-10">
      <h2 className="text-navy-ink text-[1.375rem] leading-snug lg:text-[1.5rem]">
        {booking.yacht.name}&nbsp;·&nbsp;{formatLongDate(booking.date)}
      </h2>
      <MetaLines
        lines={[
          `${formatTimeRange(booking.start_time, booking.end_time)} · ${guests(booking.guest_count)} · Paid ${formatAmount(booking.total_amount, booking.currency)}`,
        ]}
      />
    </Card>
  );

  // A request was already sent: point to its status instead of a second form.
  if (cancellation) {
    return (
      <>
        <AccountHeading {...requestHeading(booking.reference)} />
        {summary}
        <AccountNotice label="Your request has been sent" className="mt-6">
          Cancellation request {cancellation.reference} is already with our team. Please do not
          submit another request.
        </AccountNotice>
        <div className={`${buttonRowClass} mt-6`}>
          <Link
            href={userRoutes.accountBookingCancelConfirmed(booking.id)}
            className={darkButtonClass}
          >
            View cancellation status
          </Link>
          <Link href={userRoutes.accountBooking(booking.id)} className={secondaryButtonClass}>
            Back to booking
          </Link>
        </div>
      </>
    );
  }

  if (!isCancellable) {
    return (
      <>
        <AccountHeading {...requestHeading(booking.reference)} />
        {summary}
        <AccountNotice label="This booking can’t be cancelled online" className="mt-6">
          Please speak to our concierge on{" "}
          <a href="tel:+919724553452" className="underline underline-offset-2">
            +91 97245 53452
          </a>{" "}
          and we will help with any change to your plans.
        </AccountNotice>
        <Link
          href={userRoutes.accountBooking(booking.id)}
          className={`${secondaryButtonClass} mt-6`}
        >
          Back to booking
        </Link>
      </>
    );
  }

  const onReview = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (noteError) return;
    setStep({ kind: "review" });
    window.scrollTo({ top: 0 });
  };

  const onSubmit = async () => {
    setStep({ kind: "submitting" });
    try {
      await requestCancellation(booking.id, { reason, note: note.trim() || null });
      router.push(userRoutes.accountBookingCancelReceived(booking.id));
    } catch {
      setStep({
        kind: "error",
        message:
          "We couldn’t send your request just now. Your booking is unchanged — please try again.",
      });
    }
  };

  // C31: confirm before sending.
  if (step.kind !== "edit") {
    return (
      <>
        <AccountHeading
          heading="Before you"
          headingSerif="send your request."
          subtitle={`Review the request for booking ${booking.reference}.`}
        />
        <Card title="Cancellation request" className="mt-8 lg:mt-10">
          <MetaLines
            lines={[
              `${booking.yacht.name} · ${formatLongDate(booking.date)}`,
              `Reason: ${reason}.`,
              ...(note.trim() ? [`Your note: ${note.trim()}`] : []),
            ]}
          />
        </Card>
        <AccountNotice label="Please confirm" className="mt-6">
          Submitting this request does not immediately confirm cancellation or a refund. The team
          will review your booking terms and show the verified outcome.
        </AccountNotice>
        {step.kind === "error" ? (
          <p role="alert" className={fieldErrorClass}>
            {step.message}
          </p>
        ) : null}
        <div className={`${buttonRowClass} mt-6`}>
          <button
            type="button"
            onClick={() => void onSubmit()}
            disabled={step.kind === "submitting"}
            className={darkButtonClass}
          >
            {step.kind === "submitting" ? "Sending your request…" : "Submit cancellation request"}
          </button>
          <Link href={userRoutes.accountBooking(booking.id)} className={secondaryButtonClass}>
            Keep my booking
          </Link>
        </div>
      </>
    );
  }

  // C21: the request form.
  return (
    <>
      <AccountHeading {...requestHeading(booking.reference)} />
      {summary}

      <AccountNotice label="Your applicable cancellation policy" className="mt-6">
        The terms accepted with this booking apply. Any refund is assessed against that policy and
        the time of the request. No refund amount is promised before it is verified.
      </AccountNotice>

      <form onSubmit={onReview} noValidate className="mt-8 max-w-[34rem] space-y-8">
        <div>
          <label htmlFor={`${formId}-reason`} className={labelClass}>
            Reason for cancellation *
          </label>
          <div className="relative">
            <select
              id={`${formId}-reason`}
              value={reason}
              required
              onChange={(event) => setReason(event.target.value)}
              className={`${inputClass} appearance-none pr-11`}
            >
              {CANCELLATION_REASONS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
            <ChevronDown
              aria-hidden="true"
              strokeWidth={1.5}
              className="text-navy-ink pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2"
            />
          </div>
        </div>
        <div>
          <label htmlFor={`${formId}-note`} className={labelClass}>
            A note for our team
          </label>
          <textarea
            id={`${formId}-note`}
            value={note}
            rows={2}
            placeholder="Please add any details you would like us to consider."
            aria-invalid={noteError ? true : undefined}
            aria-describedby={noteError ? `${formId}-note-error` : undefined}
            onChange={(event) => setNote(event.target.value)}
            className={`${inputClass} h-auto min-h-[55px] resize-y py-4 leading-snug`}
          />
          {noteError ? (
            <p id={`${formId}-note-error`} className={fieldErrorClass}>
              {noteError}
            </p>
          ) : null}
        </div>
        <div className={buttonRowClass}>
          <button type="submit" className={darkButtonClass}>
            Review cancellation request
            <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
          </button>
          <Link href={userRoutes.accountBooking(booking.id)} className={secondaryButtonClass}>
            Keep my booking
          </Link>
        </div>
      </form>
    </>
  );
}
