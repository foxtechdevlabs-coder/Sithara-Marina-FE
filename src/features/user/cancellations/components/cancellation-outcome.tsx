"use client";

import Link from "next/link";

import {
  AccountHeading,
  AccountNotice,
  buttonRowClass,
  Card,
  darkButtonClass,
  DetailRows,
  MetaLines,
  secondaryButtonClass,
  StatusChip,
} from "@/features/user/account/components/account-ui";
import { QueryFallback } from "@/features/user/account/components/query-fallback";
import {
  formatAmount,
  formatLongDate,
  formatTimeRange,
} from "@/features/user/account/utils/account-format";
import { userRoutes } from "@/constants/routes";
import { useApiQuery } from "@/hooks/use-api-query";
import { getMyBooking, type BookingDetail } from "@/services/user/customer-bookings.service";

import {
  CANCELLATION_STATUS_LABELS,
  REFUND_STATUS_LABELS,
  refundAmount,
  refundState,
} from "../utils/cancellation-view";

type RequestStatus = NonNullable<BookingDetail["cancellation_request"]>["status"];

const OUTCOME_TEXT: Record<RequestStatus, string> = {
  pending: "Your request has reached our team. We will confirm the outcome shortly.",
  approved: "The cancellation has been approved under your booking terms.",
  rejected: "This cancellation could not be approved under your booking terms.",
};

const HEADING_SERIF: Record<RequestStatus, string> = {
  pending: "under review.",
  approved: "confirmed.",
  rejected: "reviewed.",
};

/**
 * Figma C41 "Your change of plans, confirmed.": the latest cancellation
 * request of the booking and, separately, its refund — all as the backend
 * reports them in GET /me/bookings/{ref}.
 */
export function CancellationOutcome({ bookingRef }: { bookingRef: string }) {
  const query = useApiQuery((signal) => getMyBooking(bookingRef, signal), bookingRef);
  const booking = query.data;
  const request = booking?.cancellation_request ?? null;

  if (!booking || !request) {
    return (
      <>
        <AccountHeading heading="Your change of plans." />
        {booking ? (
          <p className="text-body mt-8 max-w-[34rem] text-[15px] leading-relaxed">
            No cancellation has been requested for this booking.
          </p>
        ) : (
          <QueryFallback
            query={query}
            loadingLabel="Loading your cancellation"
            notFoundMessage="We couldn’t find this booking in your account."
          />
        )}
      </>
    );
  }

  const isApproved = request.status === "approved";
  const refund = refundState(booking);
  const amount = refundAmount(booking);
  const hasRefund = refund !== null && refund !== "none";

  return (
    <>
      <AccountHeading
        heading="Your change of plans,"
        headingSerif={HEADING_SERIF[request.status]}
        subtitle={`Booking ${booking.reference} · ${isApproved ? "Cancelled" : CANCELLATION_STATUS_LABELS[request.status]}`}
      />

      <div className="mt-8 space-y-3 lg:mt-10">
        <StatusChip tone="pearl">{CANCELLATION_STATUS_LABELS[request.status]}</StatusChip>
        {refund ? <StatusChip tone="pearl">{REFUND_STATUS_LABELS[refund]}</StatusChip> : null}
      </div>

      <Card title="Your cancellation outcome" className="mt-6">
        <MetaLines
          lines={[
            `${booking.yacht.name} · ${formatLongDate(booking.slot.date)} · ${formatTimeRange(booking.slot.start_time, booking.slot.end_time)}`,
            OUTCOME_TEXT[request.status],
            ...(request.decision_reason ? [`From our team: ${request.decision_reason}`] : []),
          ]}
        />
      </Card>

      {hasRefund && amount !== null ? (
        <>
          <DetailRows
            className="mt-7"
            rows={[
              { label: "Approved refund", value: formatAmount(amount, booking.pricing.currency) },
            ]}
          />
          <AccountNotice label="Your refund is separate" className="mt-6">
            Your refund is returned through the original payment method, or by our office. The
            verified outcome will appear in your booking record. Please do not submit another
            request.
          </AccountNotice>
        </>
      ) : null}

      <div className={`${buttonRowClass} mt-6`}>
        {hasRefund ? (
          <Link
            href={userRoutes.accountBookingRefund(booking.reference)}
            className={darkButtonClass}
          >
            View refund update
          </Link>
        ) : request.status === "pending" ? (
          <button
            type="button"
            onClick={query.reload}
            disabled={query.loading}
            className={darkButtonClass}
          >
            {query.loading ? "Checking…" : "Check for an update"}
          </button>
        ) : null}
        <Link
          href={isApproved ? userRoutes.accountPastBookings : userRoutes.accountBookings}
          className={secondaryButtonClass}
        >
          Back to my journeys
        </Link>
      </div>
    </>
  );
}
