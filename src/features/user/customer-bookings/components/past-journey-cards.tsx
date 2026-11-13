"use client";

import Link from "next/link";

import { userRoutes } from "@/constants/routes";
import {
  Card,
  CardTitle,
  DetailRows,
  MetaLines,
  secondaryButtonClass,
  StatusChip,
  textButtonClass,
} from "@/features/user/account/components/account-ui";
import {
  formatAmount,
  formatLongDate,
  guests,
  minutesBetween,
  formatHours,
} from "@/features/user/account/utils/account-format";
import {
  REFUND_STATUS_LABELS,
  refundAmount,
  refundState,
  refundTone,
} from "@/features/user/cancellations/utils/cancellation-view";
import type { BookingDetail, BookingSummary } from "@/services/user/customer-bookings.service";

import { useYachtInfo } from "../hooks/use-yacht-info";
import { shortStatus } from "../utils/booking-view";

const smallButton = "min-h-[46px] text-[12px]";

function JourneyTitle({ name, date }: { name: string; date: string }) {
  return (
    <CardTitle>
      {name}&nbsp;·&nbsp;{formatLongDate(date)}
    </CardTitle>
  );
}

/** Figma C18: a completed charter, with its details and invoice. No photo. */
export function PastJourneyCard({ booking }: { booking: BookingSummary }) {
  const yacht = useYachtInfo(booking.yacht.slug);
  const minutes = minutesBetween(booking.start_time, booking.end_time);
  // An invoice exists once a booking was confirmed; a no-show was confirmed too.
  const hasInvoice = booking.status === "completed" || booking.status === "no_show";

  return (
    <Card as="article">
      <JourneyTitle name={booking.yacht.name} date={booking.date} />
      <MetaLines
        lines={[
          [yacht?.departureCity, minutes ? formatHours(minutes) : null, guests(booking.guest_count)]
            .filter(Boolean)
            .join(" · "),
          booking.reference,
        ]}
      />
      <StatusChip tone="pearl" className="mt-3">
        {shortStatus(booking.status)}
      </StatusChip>
      <div className="mt-2 flex flex-col items-start gap-1">
        <Link
          href={userRoutes.accountBooking(booking.reference)}
          className={`${secondaryButtonClass} ${smallButton}`}
        >
          View charter details
        </Link>
        {hasInvoice ? (
          <Link
            href={userRoutes.accountBookingInvoice(booking.reference)}
            className={textButtonClass}
          >
            View invoice
          </Link>
        ) : null}
      </div>
    </Card>
  );
}

/** Figma C50: a cancelled charter, its refund shown separately. */
export function CancelledJourneyCard({ booking }: { booking: BookingDetail }) {
  const state = refundState(booking);
  const amount = refundAmount(booking);
  const reference = booking.refunds.find((refund) => refund.reference)?.reference ?? null;
  const showsRefund = state !== null && state !== "none";

  return (
    <Card as="article">
      <JourneyTitle name={booking.yacht.name} date={booking.slot.date} />
      <MetaLines lines={[`${booking.reference} · Cancelled`]} />
      <div className="mt-3 space-y-2.5">
        <StatusChip tone="pearl">Cancelled</StatusChip>
        {state ? (
          <StatusChip tone={refundTone(state)}>{REFUND_STATUS_LABELS[state]}</StatusChip>
        ) : null}
      </div>
      {showsRefund && amount !== null ? (
        <DetailRows
          className="mt-4"
          rows={[
            {
              label: reference ? "Refund reference" : "Refund",
              value: [reference, formatAmount(amount, booking.pricing.currency)]
                .filter(Boolean)
                .join(" · "),
            },
          ]}
        />
      ) : null}
      <Link
        href={
          showsRefund
            ? userRoutes.accountBookingRefund(booking.reference)
            : booking.cancellation_request
              ? userRoutes.accountBookingCancelConfirmed(booking.reference)
              : userRoutes.accountBooking(booking.reference)
        }
        className={`${secondaryButtonClass} mt-4`}
      >
        {booking.cancellation_request || showsRefund
          ? "View cancellation and refund"
          : "View booking"}
      </Link>
    </Card>
  );
}
