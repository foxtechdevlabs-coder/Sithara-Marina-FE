"use client";

import { ArrowRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, type FormEvent } from "react";

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
import { accountErrorMessage } from "@/features/user/account/utils/account-error";
import {
  formatAmount,
  formatLongDate,
  formatTimeRange,
  guests,
} from "@/features/user/account/utils/account-format";
import { userRoutes } from "@/constants/routes";
import { useApiQuery } from "@/hooks/use-api-query";
import { isApiError } from "@/services/http/api-error";
import {
  CANCELLATION_REASON_MAX,
  CANCELLATION_REASONS,
  getCancellationPreview,
  requestCancellation,
  type CancellationPreview,
} from "@/services/user/cancellations.service";
import { getMyBooking, type BookingDetail } from "@/services/user/customer-bookings.service";

async function loadCancellation(bookingRef: string, signal: AbortSignal) {
  const [booking, preview] = await Promise.all([
    getMyBooking(bookingRef, signal),
    getCancellationPreview(bookingRef, signal),
  ]);
  return { booking, preview };
}

const requestHeading = (reference: string) => ({
  heading: "A change",
  headingSerif: "of plans.",
  subtitle: `Request a cancellation for ${reference}. We will guide you through the next step.`,
});

/** The chosen reason and the optional note, as the one `reason` the backend takes. */
const composeReason = (reason: string, note: string) =>
  note.trim() ? `${reason}. ${note.trim()}` : reason;

/**
 * Figma C21 "A change of plans." (the booking, its policy and the reason),
 * then C31 "Before you send your request." to confirm it. Whether a request
 * is possible is the backend's answer (GET …/cancellation-preview).
 */
export function CancelBooking({ bookingRef }: { bookingRef: string }) {
  const query = useApiQuery((signal) => loadCancellation(bookingRef, signal), bookingRef);

  if (!query.data) {
    return (
      <>
        <AccountHeading {...requestHeading(bookingRef)} />
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

const BLOCKED_TEXT: Record<NonNullable<CancellationPreview["blocked_reason"]>, string> = {
  not_confirmed: "Only a confirmed booking can be cancelled online.",
  charter_started: "Your charter has already begun, so it can no longer be cancelled online.",
  request_pending: "A cancellation request for this booking is already with our team.",
};

function CancelBookingBody({
  booking,
  preview,
}: {
  booking: BookingDetail;
  preview: CancellationPreview;
}) {
  const router = useRouter();
  const formId = useId();
  const [reason, setReason] = useState<string>(CANCELLATION_REASONS[0]);
  const [note, setNote] = useState("");
  const [step, setStep] = useState<Step>({ kind: "edit" });
  const isSubmitting = useRef(false);
  const composed = composeReason(reason, note);
  const noteError =
    composed.length > CANCELLATION_REASON_MAX
      ? `Please shorten your note by ${composed.length - CANCELLATION_REASON_MAX} characters.`
      : null;

  const summary = (
    <Card as="div" className="mt-8 lg:mt-10">
      <h2 className="text-navy-ink text-[1.375rem] leading-snug lg:text-[1.5rem]">
        {booking.yacht.name}&nbsp;·&nbsp;{formatLongDate(booking.slot.date)}
      </h2>
      <MetaLines
        lines={[
          `${formatTimeRange(booking.slot.start_time, booking.slot.end_time)} · ${guests(booking.guest_count)} · Paid ${formatAmount(preview.paid_amount, preview.currency)}`,
        ]}
      />
    </Card>
  );

  if (!preview.can_request) {
    const isPending = preview.blocked_reason === "request_pending";
    return (
      <>
        <AccountHeading {...requestHeading(booking.reference)} />
        {summary}
        <AccountNotice
          label={
            isPending ? "Your request has been sent" : "This booking can’t be cancelled online"
          }
          className="mt-6"
        >
          {preview.blocked_reason ? BLOCKED_TEXT[preview.blocked_reason] : null}{" "}
          {isPending ? (
            "Please do not submit another request."
          ) : (
            <>
              Please speak to our concierge on{" "}
              <a href="tel:+919724553452" className="underline underline-offset-2">
                +91 97245 53452
              </a>{" "}
              and we will help with any change to your plans.
            </>
          )}
        </AccountNotice>
        <div className={`${buttonRowClass} mt-6`}>
          {isPending ? (
            <Link
              href={userRoutes.accountBookingCancelConfirmed(booking.reference)}
              className={darkButtonClass}
            >
              View cancellation status
            </Link>
          ) : null}
          <Link
            href={userRoutes.accountBooking(booking.reference)}
            className={secondaryButtonClass}
          >
            Back to booking
          </Link>
        </div>
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
    if (isSubmitting.current) return; // one request, however often it is clicked
    isSubmitting.current = true;
    setStep({ kind: "submitting" });
    try {
      await requestCancellation(booking.reference, composed);
      router.push(userRoutes.accountBookingCancelReceived(booking.reference));
    } catch (error) {
      isSubmitting.current = false;
      if (isApiError(error) && error.code === "CANCELLATION_REQUEST_EXISTS") {
        router.push(userRoutes.accountBookingCancelConfirmed(booking.reference));
        return;
      }
      setStep({
        kind: "error",
        message: accountErrorMessage(
          error,
          "We couldn’t send your request just now. Your booking is unchanged — please try again.",
          {
            CANCELLATION_NOT_ALLOWED:
              "This booking can no longer be cancelled online. Please speak to our concierge.",
            BOOKING_NOT_FOUND: "We couldn’t find this booking in your account.",
          },
        ),
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
              `${booking.yacht.name} · ${formatLongDate(booking.slot.date)}`,
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
          <Link
            href={userRoutes.accountBooking(booking.reference)}
            className={secondaryButtonClass}
          >
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
        {preview.cancellation_summary ??
          "The terms accepted with this booking apply. Any refund is assessed against that policy and the time of the request."}{" "}
        No refund amount is promised before it is verified.
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
          <Link
            href={userRoutes.accountBooking(booking.reference)}
            className={secondaryButtonClass}
          >
            Keep my booking
          </Link>
        </div>
      </form>
    </>
  );
}
