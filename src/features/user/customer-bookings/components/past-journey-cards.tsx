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
  formatHours,
  formatLongDate,
  guests,
} from "@/features/user/account/utils/account-format";
import {
  REFUND_STATUS_LABELS,
  refundTone,
} from "@/features/user/cancellations/utils/cancellation-view";
import type { Cancellation } from "@/services/user/cancellations.service";
import type { CustomerBooking } from "@/services/user/customer-bookings.service";

import { CUSTOMER_STATUS_LABELS } from "../utils/booking-view";

const smallButton = "min-h-[46px] text-[12px]";

function JourneyTitle({ booking }: { booking: CustomerBooking }) {
  return (
    <CardTitle>
      {booking.yacht.name}&nbsp;·&nbsp;{formatLongDate(booking.date)}
    </CardTitle>
  );
}

/** Figma C18: a completed charter, with its details and invoice. No photo. */
export function PastJourneyCard({ booking }: { booking: CustomerBooking }) {
  return (
    <Card as="article">
      <JourneyTitle booking={booking} />
      <MetaLines
        lines={[
          `${booking.departure} · ${formatHours(booking.duration_minutes)} · ${guests(booking.guest_count)}`,
          booking.reference,
        ]}
      />
      <StatusChip tone="pearl" className="mt-3">
        {CUSTOMER_STATUS_LABELS[booking.status].split(" · ")[0]}
      </StatusChip>
      <div className="mt-2 flex flex-col items-start gap-1">
        <Link
          href={userRoutes.accountBooking(booking.id)}
          className={`${secondaryButtonClass} ${smallButton}`}
        >
          View charter details
        </Link>
        {booking.invoice_number ? (
          <Link href={userRoutes.accountBookingInvoice(booking.id)} className={textButtonClass}>
            View invoice
          </Link>
        ) : null}
      </div>
    </Card>
  );
}

/**
 * Figma C50: a cancelled charter, its refund shown separately. `cancellation`
 * is null when the booking was cancelled without a request from the account.
 */
export function CancelledJourneyCard({
  booking,
  cancellation,
}: {
  booking: CustomerBooking;
  cancellation: Cancellation | null;
}) {
  const refund = cancellation?.refund ?? null;

  return (
    <Card as="article">
      <JourneyTitle booking={booking} />
      <MetaLines lines={[`${booking.reference} · Cancelled`]} />
      <div className="mt-3 space-y-2.5">
        <StatusChip tone="pearl">Cancelled</StatusChip>
        {refund ? (
          <StatusChip tone={refundTone(refund)}>{REFUND_STATUS_LABELS[refund.status]}</StatusChip>
        ) : null}
      </div>
      {refund ? (
        <DetailRows
          className="mt-4"
          rows={[
            {
              label: "Refund reference",
              value: `${refund.reference} · ${formatAmount(refund.amount, booking.currency)}`,
            },
          ]}
        />
      ) : null}
      <Link
        href={
          refund
            ? userRoutes.accountBookingRefund(booking.id)
            : cancellation
              ? userRoutes.accountBookingCancelConfirmed(booking.id)
              : userRoutes.accountBooking(booking.id)
        }
        className={`${secondaryButtonClass} mt-4`}
      >
        {cancellation ? "View cancellation and refund" : "View booking"}
      </Link>
    </Card>
  );
}
