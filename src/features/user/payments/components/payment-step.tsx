"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";

import { userRoutes } from "@/constants/routes";
import { useAuthSession } from "@/features/user/auth/session";
import {
  BOOKING_STATUS_LABELS,
  bookingOutcome,
} from "@/features/user/booking/utils/booking-status";
import {
  CheckoutPage,
  Loading,
  Notice,
  SectionTitle,
  secondaryButtonClass,
  textLinkClass,
} from "@/features/user/checkout/components/checkout-ui";
import { BookingRows } from "@/features/user/checkout/components/price-summary";
import { formatCountdown, useCountdown } from "@/features/user/checkout/hooks/use-countdown";
import { checkoutErrorMessage } from "@/features/user/checkout/utils/checkout-error-message";
import { clearCheckoutState } from "@/features/user/checkout/utils/checkout-store";
import { useApiQuery } from "@/hooks/use-api-query";
import { getBooking } from "@/services/user/booking.service";

import { useBookingStatusPoll } from "../hooks/use-booking-status-poll";

export const PAYMENT_VERIFYING_MESSAGE = "Verifying your payment, please wait...";
export const PAYMENT_TIMEOUT_MESSAGE =
  "Your payment is taking a bit longer to process. Please check your dashboard or email for updates shortly.";

interface PaymentStepProps {
  bookingId: string;
  checkoutToken: string | null;
}

/**
 * The booking waiting for payment. The deployed backend has no payment
 * endpoints yet, so nothing is charged and the Razorpay modal is not opened
 * here: this step only reports what GET /bookings/{id}/status says.
 */
export function PaymentStep({ bookingId, checkoutToken }: PaymentStepProps) {
  const router = useRouter();
  const signedIn = useAuthSession() !== null;
  const booking = useApiQuery((signal) => getBooking(bookingId, checkoutToken, signal), bookingId);
  const poll = useBookingStatusPoll(bookingId, checkoutToken);
  const { state } = poll;
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

  if (!data) {
    return (
      <CheckoutPage heading="Your" headingSerif="booking">
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
      Choose another charter
    </Link>
  );
  const closed = outcome === "closed" || state.outcome === "failed";
  const closedStatus = state.outcome === "failed" ? state.status.status : data.status;
  // Null while pending means the slot was released: nothing is reserved any more.
  const expired = !closed && (holdExpiresAt === null || secondsLeft === 0);

  return (
    <CheckoutPage
      heading="Your"
      headingSerif="booking"
      intro={`Reference ${data.reference}`}
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
        ) : expired ? (
          <Notice alert>The time to pay for this booking has passed. {startAgain}</Notice>
        ) : (
          <>
            <Notice>
              Your booking is reserved and has not been charged. Online payment isn’t open yet, so
              it can’t be paid for here.
            </Notice>
            {secondsLeft !== null && (
              <p role="timer" className="mt-[12px] text-[16px] leading-[26px]">
                Reserved for another{" "}
                <strong className="font-medium">{formatCountdown(secondsLeft)}</strong>.
              </p>
            )}
            {state.outcome === "polling" && (
              <>
                <Notice>{PAYMENT_VERIFYING_MESSAGE}</Notice>
                <Loading label={PAYMENT_VERIFYING_MESSAGE} />
              </>
            )}
            {state.outcome === "timeout" && <Notice>{PAYMENT_TIMEOUT_MESSAGE}</Notice>}
            {state.outcome === "error" && (
              <Notice alert>
                {checkoutErrorMessage(state.error, "We couldn’t check this booking just now.")}
              </Notice>
            )}
            <div className="mt-[24px]">
              <button
                type="button"
                disabled={state.outcome === "polling"}
                onClick={() => void poll.start()}
                className={secondaryButtonClass}
              >
                Check booking status
              </button>
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
