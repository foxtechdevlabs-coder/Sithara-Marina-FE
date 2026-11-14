"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { BODY } from "@/components/admin/admin-theme";
import { LoadState, OUTLINE_STYLE } from "@/components/admin/form-parts";
import { adminRoutes } from "@/constants/routes";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { cx } from "@/lib/cx";
import { getBooking } from "@/services/admin/bookings.service";
import { findPendingCancellationRequest } from "@/services/admin/cancellation-requests.service";

import { bookingErrorMessage, bookingStatusLabel } from "../utils/booking-format";
import { PageHeader, pagePadding, smallOutline } from "./booking-ui";

/**
 * "Review a change of plans." A cancellation is reviewed only when the
 * customer has asked for it: this address opens their pending request (where
 * staff approve or decline it), and otherwise explains there is nothing to
 * review. Staff can't cancel a booking the customer hasn't asked to cancel.
 */
export function BookingCancel({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const lookup = useAdminQuery(async (signal) => {
    const booking = await getBooking(bookingId, signal);
    const request = await findPendingCancellationRequest(bookingId, booking.reference, signal);
    return { booking, request };
  }, `booking-cancel:${bookingId}`);
  const requestId = lookup.data?.request?.id;

  useEffect(() => {
    if (requestId) router.replace(adminRoutes.cancellationRequest(requestId));
  }, [requestId, router]);

  if (!lookup.data || requestId)
    return (
      <div className={pagePadding}>
        <LoadState
          loading={lookup.loading || Boolean(requestId)}
          error={
            lookup.error
              ? `Couldn't load the booking. ${bookingErrorMessage(lookup.error)}`
              : undefined
          }
          onRetry={lookup.reload}
          label={requestId ? "Opening the cancellation request" : "Loading booking"}
        />
      </div>
    );

  const b = lookup.data.booking;
  const open = b.status === "pending_payment" || b.status === "confirmed";
  return (
    <div className={pagePadding}>
      <PageHeader title="Review a change of plans." subtitle={`Booking ${b.reference}`} />
      <p className="mt-[24px] max-w-[640px] text-[14px] leading-[22px]" style={{ color: BODY }}>
        {open
          ? "The customer hasn’t asked to cancel this booking, so there is no cancellation to review. A cancellation can be reviewed once the customer requests it."
          : `This booking is ${bookingStatusLabel(b.status).toLowerCase()}, so there is no cancellation to review.`}
      </p>
      <div className="mt-[18px] flex flex-wrap gap-[14px]">
        <Link
          href={adminRoutes.booking(b.id)}
          className={cx(smallOutline, "w-fit")}
          style={OUTLINE_STYLE}
        >
          Back to booking
        </Link>
        <Link
          href={adminRoutes.cancellationRequests}
          className={cx(smallOutline, "w-fit")}
          style={OUTLINE_STYLE}
        >
          Cancellation requests
        </Link>
      </div>
    </div>
  );
}
