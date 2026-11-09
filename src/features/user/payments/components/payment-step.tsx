"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

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
  primaryButtonClass,
  primaryButtonStyle,
  SectionTitle,
  secondaryButtonClass,
  textLinkClass,
} from "@/features/user/checkout/components/checkout-ui";
import { BookingRows } from "@/features/user/checkout/components/price-summary";
import { formatCountdown, useCountdown } from "@/features/user/checkout/hooks/use-countdown";
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

import { useBookingStatusPoll } from "../hooks/use-booking-status-poll";
import { openRazorpay } from "../utils/razorpay";

export const PAYMENT_VERIFYING_MESSAGE = "Verifying your payment, please wait...";
export const PAYMENT_TIMEOUT_MESSAGE =
  "Your payment is taking a bit longer to process. Please check your dashboard or email for updates shortly.";

/** What this tab is doing about payment. The backend's status decides the result. */
type Stage =
  | { kind: "ready" }
  | { kind: "starting" } // POST /payments, loading the SDK
  | { kind: "open" } // Razorpay modal showing
  | { kind: "verifying" } // POST /verify-payment
  | { kind: "checking" } // one status read after the modal closed
  | { kind: "review" } // paid, staff must resolve the booking
  | { kind: "problem"; message: string; retry: boolean };

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
  const router = useRouter();
  const signedIn = useAuthSession() !== null;
  const booking = useApiQuery((signal) => getBooking(bookingId, checkoutToken, signal), bookingId);
  const poll = useBookingStatusPoll(bookingId, checkoutToken);
  const { state } = poll;
  const [stage, setStage] = useState<Stage>({ kind: "ready" });
  const [expiredByServer, setExpiredByServer] = useState(false);
  const busy = useRef(false);
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

  useEffect(() => {
    if (confirmed) router.replace(userRoutes.bookingConfirmation(bookingId));
  }, [confirmed, router, bookingId]);

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
      if (verified.outcome === "confirmed" || verified.outcome === "already_done") {
        settle({ kind: "ready" });
        void poll.start(); // reads the status, which confirms and moves on
      } else if (verified.outcome === "needs_review") {
        settle({ kind: "review" });
      } else if (verified.outcome === "failed") {
        settle({
          kind: "problem",
          message: "Your payment didn’t go through. You can try again.",
          retry: true,
        });
      } else {
        settle({ kind: "ready" });
        void poll.start(); // processing: the webhook will finish it
      }
    } catch (error) {
      // The webhook may still confirm a real payment, so the status decides.
      settle({ kind: "ready" });
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

  /** Closed without a success: a payment may still be on its way, so ask once. */
  async function handleDismiss() {
    setStage({ kind: "checking" });
    try {
      const status = await getBookingStatus(bookingId, checkoutToken);
      const now = paymentOutcome(status);
      if (now === "confirmed" || now === "processing") {
        settle({ kind: "ready" });
        void poll.start();
        return;
      }
    } catch {
      // Unknown: offer to pay again; the backend reuses the open order.
    }
    settle({
      kind: "problem",
      message: "Your payment wasn’t completed, and you haven’t been charged. You can try again.",
      retry: true,
    });
  }

  async function pay() {
    if (busy.current || !data) return;
    busy.current = true;
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
        onFailure: () => undefined, // the modal stays open and lets the customer retry
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

  if (!data) {
    return (
      <CheckoutPage heading="Your" headingSerif="payment">
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
  const total = formatMinorUnits(data.pricing.total_amount, data.pricing.currency);

  return (
    <CheckoutPage
      heading="Your"
      headingSerif="payment"
      intro={`Booking reference ${data.reference}`}
      aside={
        <>
          <SectionTitle>Your charter</SectionTitle>
          <BookingRows booking={data} />
        </>
      }
    >
      <div className="max-w-[640px]" aria-live="polite">
        {confirmed ? (
          <Loading label="Opening your confirmation" />
        ) : closed ? (
          <Notice alert>
            This booking is {BOOKING_STATUS_LABELS[closedStatus].toLowerCase()}, so it can’t be paid
            for. {startAgain}
          </Notice>
        ) : stage.kind === "review" ? (
          <Notice>
            We’ve received your payment. Our team needs to confirm one detail of this booking, and
            will contact you at {data.contact.email}. Please don’t pay again.
          </Notice>
        ) : expired && !working ? (
          <Notice alert>
            The time to pay for this booking has passed, so the charter has been released.{" "}
            {startAgain}
          </Notice>
        ) : (
          <>
            <p className="text-[16px] leading-[26px]">
              Your charter is held while you pay. The total of{" "}
              <strong className="font-medium">{total}</strong>, including GST, is charged securely
              by Razorpay.
            </p>
            {secondsLeft !== null && secondsLeft > 0 && (
              <p role="timer" className="mt-[12px] text-[16px] leading-[26px]">
                Time left to pay:{" "}
                <strong className="font-medium">{formatCountdown(secondsLeft)}</strong>
              </p>
            )}

            {(stage.kind === "verifying" ||
              stage.kind === "checking" ||
              state.outcome === "polling") && (
              <>
                <Notice>{PAYMENT_VERIFYING_MESSAGE}</Notice>
                <Loading label={PAYMENT_VERIFYING_MESSAGE} />
              </>
            )}
            {stage.kind === "problem" && <Notice alert>{stage.message}</Notice>}
            {paymentFailed && stage.kind !== "problem" && (
              <Notice alert>Your payment didn’t go through. You can try again.</Notice>
            )}
            {state.outcome === "timeout" && <Notice>{PAYMENT_TIMEOUT_MESSAGE}</Notice>}
            {state.outcome === "error" && (
              <Notice alert>
                {checkoutErrorMessage(state.error, "We couldn’t check this booking just now.")}
              </Notice>
            )}

            <div className="mt-[28px] flex flex-wrap gap-[16px]">
              {(stage.kind !== "problem" || stage.retry) && state.outcome !== "timeout" && (
                <button
                  type="button"
                  disabled={working || expired}
                  onClick={() => void pay()}
                  className={primaryButtonClass}
                  style={primaryButtonStyle}
                >
                  {stage.kind === "starting"
                    ? "Opening secure payment…"
                    : stage.kind === "open"
                      ? "Payment window open…"
                      : paymentFailed || stage.kind === "problem"
                        ? `Try again · ${total}`
                        : `Pay ${total}`}
                  <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-3.5 shrink-0" />
                </button>
              )}
              {(state.outcome === "timeout" || state.outcome === "error") && (
                <button
                  type="button"
                  onClick={() => void poll.start()}
                  className={secondaryButtonClass}
                >
                  Check booking status
                </button>
              )}
            </div>
          </>
        )}
        {signedIn ? null : (
          <p className="mt-[20px] text-[14px] leading-[20px] text-[#7a7f85]">
            Keep this tab open: it holds your access to this booking.
          </p>
        )}
      </div>
    </CheckoutPage>
  );
}
