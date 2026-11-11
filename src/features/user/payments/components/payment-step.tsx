"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Spinner } from "@/components/ui/spinner";
import { userRoutes } from "@/constants/routes";
import { useAuthSession } from "@/features/user/auth/session";
import {
  BOOKING_STATUS_LABELS,
  bookingOutcome,
  paymentOutcome,
} from "@/features/user/booking/utils/booking-status";
import {
  CheckoutPage,
  Loading,
  Notice,
  textLinkClass,
} from "@/features/user/checkout/components/checkout-ui";
import { LeadGuestForm } from "@/features/user/checkout/components/lead-guest-form";
import {
  Accordion,
  AccordionGroup,
  CharterDetails,
  charterFromBooking,
  charterSummary,
  Consent,
  PayAction,
  PaymentSummary,
  PayNotice,
  priceFromBooking,
  BookingCard,
  ReviewPayFrame,
  useSections,
} from "@/features/user/checkout/components/review-pay";
import { useCountdown } from "@/features/user/checkout/hooks/use-countdown";
import { checkoutErrorMessage } from "@/features/user/checkout/utils/checkout-error-message";
import { clearCheckoutState } from "@/features/user/checkout/utils/checkout-store";
import { formatMinorUnits } from "@/features/user/yachts/utils/yacht-view";
import { useApiQuery } from "@/hooks/use-api-query";
import { getBackendErrorDetails } from "@/services/http/backend-error";
import {
  getBooking,
  getBookingStatus,
  startPayment,
  verifyPayment,
  type RazorpayPaymentResult,
} from "@/services/user/booking.service";
import { getPublicSettings } from "@/services/user/settings.service";
import { getYacht } from "@/services/user/yachts.service";

import { useBookingStatusPoll } from "../hooks/use-booking-status-poll";
import {
  PaymentProcessing,
  processingPrimaryClass,
  processingPrimaryStyle,
  processingSecondaryClass,
  type ProcessingKind,
} from "./payment-processing";
import { takePaymentRequest } from "../utils/pay-intent";
import { DISMISS_CHECK_MS } from "../utils/poll-booking-status";
import { openRazorpay } from "../utils/razorpay";

const processingUnconfirmedCheckClass = (secondary: boolean) =>
  secondary ? processingSecondaryClass : processingPrimaryClass;

export const PAYMENT_VERIFYING_MESSAGE = "Verifying your payment, please wait...";
export const PAYMENT_TIMEOUT_MESSAGE =
  "Your payment is taking a bit longer to process. Please check your dashboard or email for updates shortly.";

/** What this tab is doing about payment. The backend's status decides the result. */
type Stage =
  | { kind: "ready" }
  | { kind: "starting" } // POST /payments, loading the SDK
  | { kind: "open" } // Razorpay modal showing
  | { kind: "verifying" } // POST /verify-payment
  | { kind: "confirming" } // verified: polling until the status says confirmed
  | { kind: "pending" } // not decided yet (or found in flight on load): polling
  | { kind: "checking" } // one status read after the modal closed
  | { kind: "review" } // paid, staff must resolve the booking
  | {
      kind: "problem";
      message: string;
      retry: boolean;
      /** Closed without paying, rather than a payment that failed. */
      cancelled?: boolean;
      /** Razorpay's own description of a failed attempt, when it gave one. */
      reason?: string;
    };

const FAILED_MESSAGE =
  "Your payment could not be completed. You can try again or check your booking details.";
const CANCELLED_MESSAGE =
  "You closed the payment window before paying, so you haven’t been charged. You can try again when you’re ready.";

/** Customer text for a failed POST /payments, and whether paying again can help. */
function startProblem(error: unknown): { message: string; retry: boolean; expired?: boolean } {
  switch (getBackendErrorDetails(error).code) {
    case "HOLD_EXPIRED":
      return {
        message: "The time to pay for this booking has passed.",
        retry: false,
        expired: true,
      };
    case "PAYMENT_NOT_ALLOWED":
      return { message: "This booking isn’t waiting for payment any more.", retry: false };
    case "PAYMENT_NOT_CONFIGURED":
      return {
        message:
          "Online payment isn’t available just now. Please contact our concierge to complete your booking.",
        retry: false,
      };
    case "PAYMENT_PROVIDER_UNAVAILABLE":
    case "PAYMENT_PROVIDER_ERROR":
      return {
        message: "Our payment provider didn’t respond. Nothing was charged, so please try again.",
        retry: true,
      };
    default:
      return {
        message: checkoutErrorMessage(error, "We couldn’t start your payment. Please try again."),
        retry: true,
      };
  }
}

interface PaymentStepProps {
  bookingId: string;
  checkoutToken: string | null;
}

/**
 * Pays for a `pending_payment` booking with Razorpay Checkout. The backend
 * creates the order and sets the amount; the browser only opens the modal and
 * passes Razorpay's result back for verification. Only the backend's status
 * confirms the booking.
 */
export function PaymentStep({ bookingId, checkoutToken }: PaymentStepProps) {
  const signedIn = useAuthSession() !== null;
  const booking = useApiQuery((signal) => getBooking(bookingId, checkoutToken, signal), bookingId);
  const poll = useBookingStatusPoll(bookingId, checkoutToken);
  const { state } = poll;
  const [stage, setStage] = useState<Stage>({ kind: "ready" });
  const [expiredByServer, setExpiredByServer] = useState(false);
  /** After a failed attempt the customer may look over the booking before retrying. */
  const [reviewing, setReviewing] = useState(false);
  const sections = useSections(["payment"]);
  const slug = booking.data?.yacht.slug ?? "";
  const yacht = useApiQuery(
    (signal) => (slug ? getYacht(slug, signal) : Promise.resolve(undefined)),
    slug,
  );
  const settings = useApiQuery((signal) => getPublicSettings(signal), "settings");
  const busy = useRef(false);
  /** Set when Razorpay reports this attempt failed (its `payment.failed` event). */
  const razorpayFailure = useRef<string | null>(null);
  /**
   * Why the page is waiting on the backend: "paid" after Razorpay reported a
   * success, "check" after the window closed without one, "reload" when the page
   * reopened mid-payment. Only "check" and "reload" may offer to open the same
   * payment again when the wait ends unconfirmed.
   */
  const [waitReason, setWaitReason] = useState<"paid" | "check" | "reload" | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const data = booking.data;
  const outcome = data ? bookingOutcome(data.status) : null;
  const confirmed = outcome === "confirmed" || state.outcome === "confirmed";

  const reloadBooking = booking.reload;
  useEffect(() => {
    // The poll confirmed it: read the booking again so what is shown is current.
    if (state.outcome === "confirmed") reloadBooking();
  }, [state.outcome, reloadBooking]);

  const holdExpiresAt = data?.hold_expires_at ?? null;
  const deadlineMs = useMemo(
    () => (holdExpiresAt ? new Date(holdExpiresAt).getTime() : null),
    [holdExpiresAt],
  );
  const secondsLeft = useCountdown(deadlineMs);

  const settle = (next: Stage) => {
    busy.current = false;
    if (mounted.current) setStage(next);
  };

  /** Razorpay says it succeeded: the backend checks the signature and decides. */
  async function handleSuccess(result: RazorpayPaymentResult) {
    setStage({ kind: "verifying" });
    try {
      const verified = await verifyPayment(bookingId, result, checkoutToken);
      setWaitReason("paid");
      if (verified.outcome === "confirmed" || verified.outcome === "already_done") {
        settle({ kind: "confirming" });
        void poll.start(); // reads the status, which confirms it
      } else if (verified.outcome === "needs_review") {
        settle({ kind: "review" });
      } else if (verified.outcome === "failed") {
        settle({ kind: "problem", message: FAILED_MESSAGE, retry: true });
      } else {
        settle({ kind: "pending" });
        void poll.start(); // processing: the webhook will finish it
      }
    } catch (error) {
      // The webhook may still confirm a real payment, so the status decides.
      setWaitReason("paid");
      settle({ kind: "pending" });
      void poll.start();
      if (getBackendErrorDetails(error).code === "INVALID_PAYMENT_SIGNATURE" && mounted.current) {
        setStage({
          kind: "problem",
          message:
            "We couldn’t verify this payment with Razorpay. We’re checking your booking’s status.",
          retry: false,
        });
      }
    }
  }

  /**
   * Closed without a success. The backend is asked once. A confirmed booking
   * goes on to confirmation. Only when Razorpay did not report a failure is a
   * `processing` payment waited on; a failure Razorpay reported is shown at once.
   */
  async function handleDismiss() {
    setStage({ kind: "checking" });
    const failure = razorpayFailure.current;
    try {
      const status = await getBookingStatus(bookingId, checkoutToken);
      const now = paymentOutcome(status);
      if (now === "confirmed") {
        settle({ kind: "confirming" });
        void poll.start();
        return;
      }
      if (now === "processing" && failure === null) {
        // Closing the window is not proof of anything: a UPI payment may still be
        // on its way. Check briefly, then say we couldn't confirm.
        setWaitReason("check");
        settle({ kind: "pending" });
        void poll.start(DISMISS_CHECK_MS);
        return;
      }
      if (now === "closed") {
        booking.reload(); // shows why, once the booking is read again
        settle({
          kind: "problem",
          message: "This booking is no longer waiting for payment, so it can’t be paid for here.",
          retry: false,
        });
        return;
      }
      if (now === "payment_failed" && failure === null) {
        settle({
          kind: "problem",
          message: status.payment_status === "cancelled" ? CANCELLED_MESSAGE : FAILED_MESSAGE,
          retry: true,
          cancelled: status.payment_status === "cancelled",
        });
        return;
      }
    } catch {
      // Unknown: offer to pay again; the backend reuses the open order.
    }
    settle(
      failure !== null
        ? { kind: "problem", message: FAILED_MESSAGE, retry: true, reason: failure || undefined }
        : { kind: "problem", message: CANCELLED_MESSAGE, retry: true, cancelled: true },
    );
  }

  async function pay() {
    if (busy.current || !data) return;
    busy.current = true;
    setReviewing(false);
    razorpayFailure.current = null;
    setWaitReason(null);
    poll.reset(); // a result about an earlier attempt must not describe this one
    setStage({ kind: "starting" });
    try {
      const payment = await startPayment(bookingId, checkoutToken);
      if (payment.provider !== "razorpay") {
        settle({
          kind: "problem",
          message: "This payment method isn’t supported here. Please contact our concierge.",
          retry: false,
        });
        return;
      }
      await openRazorpay({
        payment,
        description: `Booking ${data.reference}`,
        prefill: {
          name: data.contact.full_name,
          email: data.contact.email,
          contact: data.contact.phone,
        },
        onSuccess: (result) => void handleSuccess(result),
        // Razorpay keeps its window open so the customer can try another method;
        // the failure is remembered and shown once the window closes.
        onFailure: (reason) => {
          razorpayFailure.current = reason ?? "";
        },
        onDismiss: () => void handleDismiss(),
      });
      setStage({ kind: "open" });
    } catch (error) {
      const problem = startProblem(error);
      if (problem.expired) setExpiredByServer(true);
      if (getBackendErrorDetails(error).code === "PAYMENT_NOT_ALLOWED") booking.reload();
      settle(
        error instanceof Error && error.message === "Razorpay did not load"
          ? {
              kind: "problem",
              message:
                "We couldn’t load the secure payment window. Check your connection and try again.",
              retry: true,
            }
          : { kind: "problem", message: problem.message, retry: problem.retry },
      );
    }
  }

  // Pay on the review page created this booking: open Razorpay at once. Deferred
  // so StrictMode's double effect run cancels the first pass; a refresh never
  // reopens it, because the request lives in memory only.
  const payRef = useRef(pay);
  useEffect(() => {
    payRef.current = pay;
  });
  const pending = data ? bookingOutcome(data.status) === "pending" : false;
  useEffect(() => {
    if (!pending) return;
    const timer = window.setTimeout(() => {
      if (takePaymentRequest(bookingId)) void payRef.current();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [pending, bookingId]);

  // Opened again while a payment is still being settled (e.g. after a refresh):
  // show it as pending and poll, rather than offering to pay a second time.
  const startPoll = poll.start;
  const inFlight =
    data !== undefined &&
    bookingOutcome(data.status) === "pending" &&
    (data.payment_status === "processing" || data.payment_status === "succeeded");
  const resumed = useRef(false);
  useEffect(() => {
    if (!inFlight || resumed.current) return;
    const timer = window.setTimeout(() => {
      resumed.current = true;
      setWaitReason("reload");
      setStage((current) => (current.kind === "ready" ? { kind: "pending" } : current));
      void startPoll(DISMISS_CHECK_MS);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [inFlight, startPoll]);

  if (!data) {
    return (
      <CheckoutPage heading="Review &" headingSerif="pay.">
        {booking.loading ? (
          <Loading label="Loading your booking" />
        ) : (
          <Notice alert>
            {checkoutErrorMessage(booking.error, "We couldn’t load your booking just now.")}{" "}
            <button type="button" className={textLinkClass} onClick={booking.reload}>
              Try again
            </button>
          </Notice>
        )}
      </CheckoutPage>
    );
  }

  const startAgain = (
    <Link
      href={userRoutes.yachtAvailability(data.yacht.slug)}
      className={textLinkClass}
      onClick={clearCheckoutState}
    >
      Choose another date and time
    </Link>
  );
  const pollFailed = state.outcome === "failed";
  const closed =
    outcome === "closed" || (pollFailed && bookingOutcome(state.status.status) === "closed");
  const paymentFailed = pollFailed && !closed;
  const closedStatus = pollFailed ? state.status.status : data.status;
  // Null while pending means the slot was released: nothing is reserved any more.
  const expired = !closed && (expiredByServer || holdExpiresAt === null || secondsLeft === 0);
  const working =
    stage.kind === "starting" ||
    stage.kind === "open" ||
    stage.kind === "verifying" ||
    stage.kind === "checking" ||
    state.outcome === "polling";
  const verifying =
    stage.kind === "verifying" || stage.kind === "checking" || state.outcome === "polling";
  const price = priceFromBooking(data);
  const charter = charterFromBooking(data, yacht.data);
  const total = formatMinorUnits(data.pricing.total_amount, data.pricing.currency);
  const canRetry = stage.kind !== "problem" || stage.retry;
  const pollFailedStatus = pollFailed ? state.status.payment_status : null;
  const latestBookingStatus = pollFailed ? state.status.status : data.status;
  const retrySafe = canRetry && !expired && latestBookingStatus === "pending_payment";
  // Opening the payment again reuses the booking and the backend's open order
  // (POST /bookings/{id}/payments → 200 "the attempt already open"). Offered only
  // after a check, never after Razorpay reported a success.
  const reopenable = retrySafe && (waitReason === "check" || waitReason === "reload");
  const finished = confirmed || closed || stage.kind === "review" || (expired && !working);

  const payLabel =
    stage.kind === "starting"
      ? "Opening secure payment…"
      : stage.kind === "open"
        ? "Payment window open…"
        : verifying
          ? "Verifying payment…"
          : paymentFailed || stage.kind === "problem"
            ? `Try again – ${total}`
            : `Proceed to payment – ${total}`;
  const payDisabled = working || finished || !canRetry || state.outcome === "timeout";
  const card = (withPay: boolean) => (
    <BookingCard
      charter={charter}
      price={price}
      settings={settings.data}
      pay={withPay ? { label: payLabel, disabled: payDisabled, onPay: () => void pay() } : undefined}
    />
  );

  const processing: ProcessingKind | null = confirmed
    ? "confirmed"
    : closed
      ? "closed"
      : stage.kind === "review"
        ? "review"
        : stage.kind === "starting"
          ? "initiating"
          : stage.kind === "open"
            ? "window"
            : stage.kind === "verifying"
              ? "verifying"
              : stage.kind === "checking"
                ? "checking"
                : state.outcome === "polling"
                  ? stage.kind === "confirming"
                    ? "verifying"
                    : "pending"
                  : paymentFailed // the backend said failed or cancelled: the wait is over
                    ? pollFailedStatus === "cancelled"
                      ? "cancelled"
                      : "failed"
                    : state.outcome === "timeout" || state.outcome === "error"
                      ? "unconfirmed"
                      : stage.kind === "pending" || stage.kind === "confirming"
                        ? "pending"
                        : expired
                          ? "expired"
                          : stage.kind === "problem"
                            ? stage.cancelled
                              ? "cancelled"
                              : "failed"
                            : null;

  if (processing && !(reviewing && (processing === "failed" || processing === "cancelled"))) {
    const phone =
      settings.data?.contact_phone && /^\+?[\d\s()-]{7,}$/.test(settings.data.contact_phone)
        ? settings.data.contact_phone
        : null;
    const email = settings.data?.contact_email ?? null;
    const contact =
      phone || email ? (
        <a
          href={phone ? `tel:${phone.replace(/[^\d+]/g, "")}` : `mailto:${email}`}
          className={processingSecondaryClass}
        >
          Contact concierge
        </a>
      ) : null;
    const chooseAgain = (
      <Link
        href={userRoutes.yachtAvailability(data.yacht.slug)}
        onClick={clearCheckoutState}
        className={processingPrimaryClass}
        style={processingPrimaryStyle}
      >
        Choose another date and time
      </Link>
    );
    const polling = state.outcome === "polling";

    const actions =
      processing === "confirmed" ? (
        <Link
          href={userRoutes.bookingConfirmation(bookingId)}
          className={processingPrimaryClass}
          style={processingPrimaryStyle}
        >
          View booking details
        </Link>
      ) : processing === "pending" || processing === "unconfirmed" ? (
        <>
          {processing === "unconfirmed" && reopenable && (
            <button
              type="button"
              onClick={() => void pay()}
              className={processingPrimaryClass}
              style={processingPrimaryStyle}
            >
              Open payment again – {total}
            </button>
          )}
          <button
            type="button"
            disabled={polling}
            onClick={() => void poll.start(waitReason === "paid" ? undefined : DISMISS_CHECK_MS)}
            className={processingUnconfirmedCheckClass(processing === "unconfirmed" && reopenable)}
            style={processing === "unconfirmed" && reopenable ? undefined : processingPrimaryStyle}
          >
            {polling ? "Checking payment status…" : "Check payment status"}
          </button>
          {contact}
        </>
      ) : processing === "failed" || processing === "cancelled" ? (
        <>
          {retrySafe && (
            <button
              type="button"
              onClick={() => void pay()}
              className={processingPrimaryClass}
              style={processingPrimaryStyle}
            >
              Try again – {total}
            </button>
          )}
          <button
            type="button"
            onClick={() => setReviewing(true)}
            className={processingSecondaryClass}
          >
            Review booking
          </button>
          {contact}
        </>
      ) : processing === "expired" || processing === "closed" ? (
        <>
          {chooseAgain}
          {contact}
        </>
      ) : processing === "review" ? (
        contact
      ) : null;

    const detail =
      processing === "pending" && waitReason === "check"
        ? "You closed the payment window. We’re checking whether a payment went through; this takes a few seconds."
        : processing === "unconfirmed" && (waitReason === "check" || waitReason === "reload")
          ? "No payment has been confirmed for this booking yet. If you approved one in your UPI or bank app, please wait a few minutes and check again rather than paying twice. Otherwise you can open the payment again."
          : processing === "failed" || processing === "cancelled"
        ? stage.kind === "problem"
          ? stage.message
          : processing === "cancelled"
            ? "This payment was cancelled, and you haven’t been charged. You can try again when you’re ready."
            : FAILED_MESSAGE
        : processing === "review"
          ? `Our team will review the transaction and contact you at ${data.contact.email}. Please do not pay again.`
          : processing === "closed"
            ? `This booking is ${BOOKING_STATUS_LABELS[closedStatus].toLowerCase()}, so it is no longer waiting for payment.`
            : null;

    const notice =
      processing === "unconfirmed"
        ? state.outcome === "error"
          ? checkoutErrorMessage(state.error, "We couldn’t check this booking just now.")
          : stage.kind === "problem"
            ? stage.message
            : null
        : processing === "failed" && stage.kind === "problem" && stage.reason
          ? `Reason given by the payment provider: ${stage.reason}`
          : processing === "failed" && !retrySafe
            ? "This booking can’t be paid for again here. Please contact our concierge."
            : null;

    const keepTab = signedIn ? "" : " Keep this tab open: it holds your access to this booking.";
    const note =
      processing === "confirmed"
        ? {
            title: "What happens next",
            body: "Your booking details and tax invoice are on your booking page.",
          }
        : processing === "failed"
          ? {
              title: "If money left your account",
              body: `Please don’t pay again. Contact our concierge with reference ${data.reference} and we’ll check it for you.`,
            }
          : processing === "pending" ||
              processing === "unconfirmed" ||
              processing === "verifying" ||
              processing === "checking"
            ? {
                title: "If confirmation takes longer",
                body: `A pending payment is not a failed payment. We only show an outcome once our system has verified it.${keepTab}`,
              }
            : null;

    return (
      <PaymentProcessing
        kind={processing}
        booking={{ charter, reference: data.reference, amount: total ?? "" }}
        detail={detail}
        notice={notice}
        actions={actions}
        note={note}
      />
    );
  }

  const terminal = confirmed ? (
    <Loading label="Opening your confirmation" />
  ) : closed ? (
    <PayNotice>
      This booking is {BOOKING_STATUS_LABELS[closedStatus].toLowerCase()}, so it can’t be paid
      for. {startAgain}
    </PayNotice>
  ) : stage.kind === "review" ? (
    <PayNotice tone="info">
      We’ve received your payment. Our team needs to confirm one detail of this booking, and will
      contact you at {data.contact.email}. Please don’t pay again.
    </PayNotice>
  ) : expired && !working ? (
    <PayNotice>
      The time to pay for this booking has passed, so the charter has been released. {startAgain}
    </PayNotice>
  ) : null;

  return (
    <ReviewPayFrame
      secondsLeft={finished ? null : secondsLeft}
      reference={data.reference}
      notices={terminal ? <div className="mb-[32px]">{terminal}</div> : null}
      aside={card(true)}
    >
      <AccordionGroup>
        <Accordion
          id="charter"
          number="01"
          title="Your charter"
          summary={charterSummary(charter)}
          open={sections.isOpen("charter")}
          onToggle={() => sections.toggle("charter")}
        >
          <CharterDetails charter={charter} />
          <p className="mt-[24px] text-[14px] leading-[21px] text-[#7a7f85]">
            Booking {data.reference} is held at these details. To change them, let this booking
            lapse and choose again.
          </p>
        </Accordion>

        <Accordion
          id="payment"
          number="02"
          title="Payment"
          summary={`Payable today · ${total}`}
          open={sections.isOpen("payment")}
          onToggle={() => sections.toggle("payment")}
        >
          <PaymentSummary price={price} />
        </Accordion>

        <Accordion
          id="guest"
          number="03"
          title="Lead guest"
          summary={`${data.contact.full_name} · ${data.contact.email}`}
          open={sections.isOpen("guest")}
          onToggle={() => sections.toggle("guest")}
        >
          <LeadGuestForm
            readOnly
            values={{
              full_name: data.contact.full_name,
              phone: data.contact.phone ?? "",
              special_requests: data.special_requests ?? "",
            }}
            email={data.contact.email}
            errors={{}}
            onChange={() => undefined}
          />
        </Accordion>
      </AccordionGroup>

      <div className="mt-[40px] xl:hidden">{card(false)}</div>

      <Consent
        terms
        policy
        locked
        onTermsChange={() => undefined}
        onPolicyChange={() => undefined}
        settings={settings.data}
      />

      <PayAction
        price={price}
        label={payLabel}
        disabled={payDisabled}
        onPay={() => void pay()}
        status={
          <>
            {verifying && (
              <PayNotice tone="info">
                <span className="inline-flex items-center gap-[12px]">
                  <Spinner label={PAYMENT_VERIFYING_MESSAGE} className="text-brand-600" />
                  <span aria-hidden="true">{PAYMENT_VERIFYING_MESSAGE}</span>
                </span>
              </PayNotice>
            )}
            {stage.kind === "problem" && <PayNotice>{stage.message}</PayNotice>}
            {paymentFailed && stage.kind !== "problem" && (
              <PayNotice>Your payment didn’t go through. You can try again.</PayNotice>
            )}
            {state.outcome === "timeout" && (
              <PayNotice tone="info">{PAYMENT_TIMEOUT_MESSAGE}</PayNotice>
            )}
            {state.outcome === "error" && (
              <PayNotice>
                {checkoutErrorMessage(state.error, "We couldn’t check this booking just now.")}
              </PayNotice>
            )}
          </>
        }
        secondary={
          <>
            {(state.outcome === "timeout" || state.outcome === "error") && (
              <button
                type="button"
                onClick={() => void poll.start()}
                className="mt-[20px] mr-[24px] text-[14px] underline underline-offset-2"
              >
                Check booking status
              </button>
            )}
            {!signedIn && (
              <p className="mt-[16px] text-[13px] leading-[19px] text-[#7a7f85]">
                Keep this tab open: it holds your access to this booking.
              </p>
            )}
          </>
        }
      />
    </ReviewPayFrame>
  );
}
