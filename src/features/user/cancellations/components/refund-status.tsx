"use client";

import Link from "next/link";

import {
  AccountHeading,
  AccountNotice,
  buttonRowClass,
  DetailRows,
  primaryButtonClass,
  primaryButtonStyle,
  secondaryButtonClass,
  StatusChip,
} from "@/features/user/account/components/account-ui";
import { QueryFallback } from "@/features/user/account/components/query-fallback";
import { formatAmount } from "@/features/user/account/utils/account-format";
import { shortStatus } from "@/features/user/customer-bookings/utils/booking-view";
import { userRoutes } from "@/constants/routes";
import { useApiQuery } from "@/hooks/use-api-query";
import { getMyBooking } from "@/services/user/customer-bookings.service";

import {
  REFUND_STATUS_LABELS,
  refundAmount,
  refundMethod,
  refundState,
  refundTone,
  type RefundState,
} from "../utils/cancellation-view";

const HEADING_SERIF: Record<RefundState, string> = {
  completed: "completed.",
  processing: "on its way.",
  decided: "approved.",
  failed: "needs attention.",
  none: "reviewed.",
};

const NOTICE: Record<RefundState, (reference: string | null) => string> = {
  completed: (reference) =>
    `The refund has been given back.${reference ? ` If you need help locating it, contact our concierge with refund reference ${reference}.` : " If you need help locating it, contact our concierge."}`,
  processing: () =>
    "Your refund is on its way back. Banks can take a few working days to show it. Please do not submit another request.",
  decided: () =>
    "Your refund has been approved and will be sent back shortly. Please do not submit another request.",
  failed: () =>
    "The refund did not go through. Our team is looking at it and will contact you to arrange it.",
  none: () =>
    "No refund is due under your booking terms. Our concierge can help with any question.",
};

/**
 * Figma C42 "Your refund, completed.": the refund of a cancelled booking, from
 * the booking's own refund records (GET /me/bookings/{ref}: `refunds`,
 * `refunded_amount`, `refund_pending_amount`, `cancellation`).
 */
export function RefundStatus({ bookingRef }: { bookingRef: string }) {
  const query = useApiQuery((signal) => getMyBooking(bookingRef, signal), bookingRef);
  const booking = query.data;
  const state = booking ? refundState(booking) : null;

  if (!booking || !state) {
    return (
      <>
        <AccountHeading heading="Your" headingSerif="refund." />
        {booking ? (
          <>
            <p className="text-body mt-8 max-w-[34rem] text-[15px] leading-relaxed">
              There is no refund for this booking yet. It will appear here once your cancellation
              outcome is confirmed.
            </p>
            <Link
              href={userRoutes.accountBookingCancelConfirmed(booking.reference)}
              className={`${secondaryButtonClass} mt-6`}
            >
              View cancellation status
            </Link>
          </>
        ) : (
          <QueryFallback
            query={query}
            loadingLabel="Loading your refund"
            notFoundMessage="We couldn’t find this booking in your account."
          />
        )}
      </>
    );
  }

  const amount = refundAmount(booking);
  const method = refundMethod(booking);
  const reference = booking.refunds.find((refund) => refund.reference)?.reference ?? null;

  return (
    <>
      <AccountHeading
        heading="Your refund,"
        headingSerif={HEADING_SERIF[state]}
        subtitle={[reference ? `Refund ${reference}` : null, `Booking ${booking.reference}`]
          .filter(Boolean)
          .join(" · ")}
      />

      <StatusChip tone={refundTone(state)} className="mt-7 lg:mt-8">
        {REFUND_STATUS_LABELS[state]}
      </StatusChip>

      <DetailRows
        className="mt-8"
        rows={[
          ...(amount !== null
            ? [
                {
                  label: state === "completed" ? "Refunded amount" : "Refund amount",
                  value: formatAmount(amount, booking.pricing.currency),
                },
              ]
            : []),
          ...(method ? [{ label: "Return method", value: method }] : []),
          { label: "Booking status", value: shortStatus(booking.status) },
        ]}
      />

      <AccountNotice label="Keep your reference" className="mt-8">
        {NOTICE[state](reference)}
      </AccountNotice>

      <div className={`${buttonRowClass} mt-6`}>
        <Link
          href={userRoutes.accountPastBookings}
          className={primaryButtonClass}
          style={primaryButtonStyle}
        >
          Return to my journeys
        </Link>
        <Link href={userRoutes.accountHelpFor(booking.reference)} className={secondaryButtonClass}>
          Contact concierge
        </Link>
      </div>
    </>
  );
}
