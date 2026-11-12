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
import { getCancellation, type Cancellation } from "@/services/user/cancellations.service";

import { CANCELLATION_STATUS_LABELS, REFUND_STATUS_LABELS } from "../utils/cancellation-view";

const OUTCOME_TEXT: Record<Cancellation["status"], string> = {
  requested: "Your request has reached our team. We will confirm the outcome shortly.",
  approved: "The cancellation has been approved under your booking terms.",
  declined: "This cancellation could not be approved under your booking terms.",
};

const HEADING_SERIF: Record<Cancellation["status"], string> = {
  requested: "under review.",
  approved: "confirmed.",
  declined: "reviewed.",
};

/**
 * Figma C41 "Your change of plans, confirmed.": the cancellation outcome, with
 * the refund shown separately. Before the review it reports the request.
 */
export function CancellationOutcome({ bookingId }: { bookingId: string }) {
  const query = useApiQuery((signal) => getCancellation(bookingId, signal), bookingId);
  const outcome = query.data;

  if (!outcome) {
    return (
      <>
        <AccountHeading heading="Your change of plans." />
        <QueryFallback
          query={query}
          loadingLabel="Loading your cancellation"
          notFoundMessage="No cancellation has been requested for this booking."
        />
      </>
    );
  }

  const isApproved = outcome.status === "approved";

  return (
    <>
      <AccountHeading
        heading="Your change of plans,"
        headingSerif={HEADING_SERIF[outcome.status]}
        subtitle={`Booking ${outcome.booking_reference} · ${isApproved ? "Cancelled" : CANCELLATION_STATUS_LABELS[outcome.status]}`}
      />

      <div className="mt-8 space-y-3 lg:mt-10">
        <StatusChip tone="pearl">{CANCELLATION_STATUS_LABELS[outcome.status]}</StatusChip>
        {outcome.refund ? (
          <StatusChip tone="pearl">{REFUND_STATUS_LABELS[outcome.refund.status]}</StatusChip>
        ) : null}
      </div>

      <Card title="Your cancellation outcome" className="mt-6">
        <MetaLines
          lines={[
            `${outcome.yacht_name} · ${formatLongDate(outcome.date)} · ${formatTimeRange(outcome.start_time, outcome.end_time)}`,
            OUTCOME_TEXT[outcome.status],
          ]}
        />
      </Card>

      {outcome.refund ? (
        <>
          <DetailRows
            className="mt-7"
            rows={[
              {
                label: "Approved refund",
                value: formatAmount(outcome.refund.amount, outcome.currency),
              },
            ]}
          />
          <AccountNotice label="Your refund is separate" className="mt-6">
            Refund {outcome.refund.reference} has been requested through the original payment
            method. The verified outcome will appear in your booking record. Please do not submit
            another request.
          </AccountNotice>
        </>
      ) : null}

      <div className={`${buttonRowClass} mt-6`}>
        {outcome.refund ? (
          <Link
            href={userRoutes.accountBookingRefund(outcome.booking_id)}
            className={darkButtonClass}
          >
            View refund update
          </Link>
        ) : (
          <button type="button" onClick={query.reload} className={darkButtonClass}>
            Check for an update
          </button>
        )}
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
