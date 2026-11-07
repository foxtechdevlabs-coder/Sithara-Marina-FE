"use client";

import Link from "next/link";

import { userRoutes } from "@/constants/routes";
import { useAuthSession } from "@/features/user/auth/session";
import {
  CheckoutPage,
  Loading,
  Notice,
  textLinkClass,
} from "@/features/user/checkout/components/checkout-ui";
import { BookingRows } from "@/features/user/checkout/components/price-summary";
import { checkoutErrorMessage } from "@/features/user/checkout/utils/checkout-error-message";
import { useCheckoutState } from "@/features/user/checkout/utils/checkout-store";
import { useApiQuery } from "@/hooks/use-api-query";
import { getBooking } from "@/services/user/booking.service";

import { BOOKING_STATUS_LABELS, bookingOutcome } from "../utils/booking-status";

const HEADING = { heading: "Booking", headingSerif: "confirmation" };

/** Loads the booking with a credential; only the backend's answer can confirm it. */
function LoadedConfirmation({
  bookingId,
  checkoutToken,
}: {
  bookingId: string;
  checkoutToken: string | null;
}) {
  const booking = useApiQuery((signal) => getBooking(bookingId, checkoutToken, signal), bookingId);
  const data = booking.data;

  if (!data) {
    return (
      <CheckoutPage {...HEADING}>
        {booking.loading ? (
          <Loading label="Loading your booking" />
        ) : (
          <Notice alert>
            {checkoutErrorMessage(booking.error, "We couldn’t load this booking just now.")}{" "}
            <button type="button" className={textLinkClass} onClick={booking.reload}>
              Try again
            </button>
          </Notice>
        )}
      </CheckoutPage>
    );
  }

  const outcome = bookingOutcome(data.status);
  return (
    <CheckoutPage
      heading={outcome === "confirmed" ? "Booking" : HEADING.heading}
      headingSerif={outcome === "confirmed" ? "confirmed" : HEADING.headingSerif}
      intro={`Reference ${data.reference}`}
    >
      <div className="max-w-[720px]">
        {outcome === "confirmed" ? (
          <p className="text-[16px] leading-[26px]">We look forward to welcoming you aboard.</p>
        ) : outcome === "pending" ? (
          <Notice>
            This booking isn’t confirmed: it’s still awaiting payment.{" "}
            <Link href={userRoutes.checkout} className={textLinkClass}>
              Back to checkout
            </Link>
          </Notice>
        ) : (
          <Notice>This booking isn’t active: {BOOKING_STATUS_LABELS[data.status]}.</Notice>
        )}
        <BookingRows booking={data} />
      </div>
    </CheckoutPage>
  );
}

/**
 * Shown only for a booking the backend reports as confirmed. A guest's
 * checkout token only opens its own booking, in the tab that made it.
 */
export function BookingConfirmation({ bookingId }: { bookingId: string }) {
  const state = useCheckoutState();
  const authSession = useAuthSession();
  const checkoutToken = state?.bookingId === bookingId ? state.checkoutToken : null;

  if (!state) {
    return (
      <CheckoutPage {...HEADING}>
        <Loading label="Loading your booking" />
      </CheckoutPage>
    );
  }

  if (!checkoutToken && !authSession) {
    const next = encodeURIComponent(userRoutes.bookingConfirmation(bookingId));
    return (
      <CheckoutPage {...HEADING}>
        <Notice>
          Bookings are shown here once they’re confirmed.{" "}
          <Link href={`${userRoutes.login}?next=${next}`} className={textLinkClass}>
            Sign in
          </Link>{" "}
          to see yours.
        </Notice>
      </CheckoutPage>
    );
  }

  return <LoadedConfirmation bookingId={bookingId} checkoutToken={checkoutToken} />;
}
