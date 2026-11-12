"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import {
  AccountHeading,
  buttonRowClass,
  Card,
  MetaLines,
  primaryButtonClass,
  primaryButtonStyle,
  secondaryButtonClass,
  StatusChip,
  StepList,
} from "@/features/user/account/components/account-ui";
import { QueryFallback } from "@/features/user/account/components/query-fallback";
import { userRoutes } from "@/constants/routes";
import { useApiQuery } from "@/hooks/use-api-query";
import { getCancellation } from "@/services/user/cancellations.service";

import { CANCELLATION_STATUS_LABELS } from "../utils/cancellation-view";

/** Figma C22 "Your request is with us.": what happens after a cancellation request. */
export function CancellationReceived({ bookingId }: { bookingId: string }) {
  const query = useApiQuery((signal) => getCancellation(bookingId, signal), bookingId);
  const cancellation = query.data;

  if (!cancellation) {
    return (
      <>
        <AccountHeading heading="Your request" headingSerif="is with us." />
        <QueryFallback
          query={query}
          loadingLabel="Loading your request"
          notFoundMessage="No cancellation has been requested for this booking."
        />
      </>
    );
  }

  return (
    <>
      <AccountHeading
        heading="Your request"
        headingSerif="is with us."
        subtitle={`Cancellation request ${cancellation.reference} has been received.`}
      />

      <StatusChip tone="pearl" className="mt-7 lg:mt-8">
        {CANCELLATION_STATUS_LABELS[cancellation.status]}
      </StatusChip>

      <Card title="What happens next" className="mt-6">
        <MetaLines
          lines={[
            "Our team will review the applicable policy and confirm the cancellation outcome and any eligible refund. Your booking and refund statuses are shown separately.",
          ]}
        />
      </Card>

      <StepList
        className="mt-8"
        steps={[
          { label: "Request received", detail: `Reference ${cancellation.reference}` },
          { label: "Review in progress", detail: "Policy and payment details being checked" },
          {
            label: "Outcome and refund status",
            detail: "We will update your booking details once verified.",
          },
        ]}
      />

      <div className={`${buttonRowClass} mt-8`}>
        <Link
          href={userRoutes.accountBookingCancelConfirmed(bookingId)}
          className={primaryButtonClass}
          style={primaryButtonStyle}
        >
          View cancellation status
          <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
        </Link>
        <Link href={userRoutes.accountHelpFor(bookingId)} className={secondaryButtonClass}>
          Contact concierge
        </Link>
      </div>
    </>
  );
}
