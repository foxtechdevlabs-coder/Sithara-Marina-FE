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
import { formatInstantDate } from "@/features/user/account/utils/account-format";
import { userRoutes } from "@/constants/routes";
import { useApiQuery } from "@/hooks/use-api-query";
import { getMyBooking } from "@/services/user/customer-bookings.service";

import { CANCELLATION_STATUS_LABELS } from "../utils/cancellation-view";

const HEADING = { heading: "Your request", headingSerif: "is with us." };

/**
 * Figma C22 "Your request is with us.": shown after POST …/cancellation-requests,
 * read back from the booking's latest request (GET /me/bookings/{ref}).
 */
export function CancellationReceived({ bookingRef }: { bookingRef: string }) {
  const query = useApiQuery((signal) => getMyBooking(bookingRef, signal), bookingRef);
  const booking = query.data;
  const request = booking?.cancellation_request ?? null;

  if (!booking || !request) {
    return (
      <>
        <AccountHeading {...HEADING} />
        {booking ? (
          <p className="text-body mt-8 max-w-[34rem] text-[15px] leading-relaxed">
            No cancellation has been requested for this booking.
          </p>
        ) : (
          <QueryFallback
            query={query}
            loadingLabel="Loading your request"
            notFoundMessage="We couldn’t find this booking in your account."
          />
        )}
      </>
    );
  }

  return (
    <>
      <AccountHeading
        {...HEADING}
        subtitle={`Your cancellation request for booking ${booking.reference} has been received.`}
      />

      <StatusChip tone="pearl" className="mt-7 lg:mt-8">
        {CANCELLATION_STATUS_LABELS[request.status]}
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
          {
            label: "Request received",
            detail: `Booking ${booking.reference} · Sent ${formatInstantDate(request.requested_at)}`,
          },
          { label: "Review in progress", detail: "Policy and payment details being checked" },
          {
            label: "Outcome and refund status",
            detail: "We will update your booking details once verified.",
          },
        ]}
      />

      <div className={`${buttonRowClass} mt-8`}>
        <Link
          href={userRoutes.accountBookingCancelConfirmed(booking.reference)}
          className={primaryButtonClass}
          style={primaryButtonStyle}
        >
          View cancellation status
          <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
        </Link>
        <Link href={userRoutes.accountHelpFor(booking.reference)} className={secondaryButtonClass}>
          Contact concierge
        </Link>
      </div>
    </>
  );
}
