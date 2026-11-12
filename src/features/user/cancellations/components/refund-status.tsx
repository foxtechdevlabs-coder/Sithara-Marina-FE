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
import { userRoutes } from "@/constants/routes";
import { useApiQuery } from "@/hooks/use-api-query";
import { getCancellation, type Cancellation } from "@/services/user/cancellations.service";

import { REFUND_STATUS_LABELS, refundTone } from "../utils/cancellation-view";

type Refund = NonNullable<Cancellation["refund"]>;

const HEADING_SERIF: Record<Refund["status"], string> = {
  completed: "completed.",
  processing: "on its way.",
  failed: "needs attention.",
};

const NOTICE: Record<Refund["status"], (reference: string) => string> = {
  completed: (reference) =>
    `Your payment provider has confirmed the refund. If you need help locating it, contact our concierge with refund reference ${reference}.`,
  processing: (reference) =>
    `Refund ${reference} has been sent to your payment provider. Banks can take a few working days to show it. Please do not submit another request.`,
  failed: (reference) =>
    `Your payment provider could not complete refund ${reference}. Our concierge will contact you to arrange it.`,
};

/** Figma C42 "Your refund, completed.": the refund of a cancelled booking. */
export function RefundStatus({ bookingId }: { bookingId: string }) {
  const query = useApiQuery((signal) => getCancellation(bookingId, signal), bookingId);
  const cancellation = query.data;

  if (!cancellation?.refund) {
    return (
      <>
        <AccountHeading heading="Your" headingSerif="refund." />
        {cancellation ? (
          <>
            <p className="text-body mt-8 max-w-[34rem] text-[15px] leading-relaxed">
              There is no refund for this booking yet. It will appear here once your cancellation
              outcome is confirmed.
            </p>
            <Link
              href={userRoutes.accountBookingCancelConfirmed(bookingId)}
              className={`${secondaryButtonClass} mt-6`}
            >
              View cancellation status
            </Link>
          </>
        ) : (
          <QueryFallback
            query={query}
            loadingLabel="Loading your refund"
            notFoundMessage="No cancellation has been requested for this booking."
          />
        )}
      </>
    );
  }

  const { refund } = cancellation;

  return (
    <>
      <AccountHeading
        heading="Your refund,"
        headingSerif={HEADING_SERIF[refund.status]}
        subtitle={`Refund ${refund.reference} · Booking ${cancellation.booking_reference}`}
      />

      <StatusChip tone={refundTone(refund)} className="mt-7 lg:mt-8">
        {REFUND_STATUS_LABELS[refund.status]}
      </StatusChip>

      <DetailRows
        className="mt-8"
        rows={[
          {
            label: refund.status === "completed" ? "Refunded amount" : "Refund amount",
            value: formatAmount(refund.amount, cancellation.currency),
          },
          { label: "Return method", value: refund.method },
          { label: "Booking status", value: "Cancelled" },
        ]}
      />

      <AccountNotice label="Keep your reference" className="mt-8">
        {NOTICE[refund.status](refund.reference)}
      </AccountNotice>

      <div className={`${buttonRowClass} mt-6`}>
        <Link
          href={userRoutes.accountPastBookings}
          className={primaryButtonClass}
          style={primaryButtonStyle}
        >
          Return to my journeys
        </Link>
        <Link href={userRoutes.accountHelpFor(bookingId)} className={secondaryButtonClass}>
          Contact concierge
        </Link>
      </div>
    </>
  );
}
