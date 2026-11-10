"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { BODY } from "@/components/admin/admin-theme";
import { LoadState, OUTLINE_STYLE } from "@/components/admin/form-parts";
import { adminRoutes } from "@/constants/routes";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import {
  addBookingNote,
  getBooking,
  issuePaymentLink,
  recordOfficePayment,
} from "@/services/admin/bookings.service";

import {
  bookingErrorMessage,
  bookingStatusLabel,
  formatRupees,
  shortDate,
} from "../utils/booking-format";
import { PageHeader, pagePadding, smallOutline } from "./booking-ui";
import { PaymentChoice, type PaymentMode } from "./payment-choice";

/**
 * Payment for an unpaid office booking: record cash or a bank transfer
 * (admin Figma A10, POST …/payments) or email a secure payment link
 * (A38, POST …/payment-link).
 */
export function BookingPayment({ bookingId, mode }: { bookingId: string; mode: PaymentMode }) {
  const router = useRouter();
  const booking = useAdminQuery((signal) => getBooking(bookingId, signal), `booking:${bookingId}`);

  if (!booking.data) {
    return (
      <div className={pagePadding}>
        <LoadState
          loading={booking.loading}
          error={
            booking.error
              ? `Couldn't load the booking. ${bookingErrorMessage(booking.error)}`
              : undefined
          }
          onRetry={booking.reload}
          label="Loading booking"
        />
      </div>
    );
  }

  const b = booking.data;
  const back = adminRoutes.booking(b.id);
  const payable = b.source === "office" && b.status === "pending_payment";

  return (
    <div className={pagePadding}>
      <PageHeader
        title={mode === "link" ? "A secure next step for the guest." : "A clear payment record."}
        subtitle={
          mode === "link"
            ? `Payment link for office booking ${b.reference}`
            : `Office booking · ${b.yacht.name} · ${shortDate(b.date)} · Total ${formatRupees(b.total_amount)}`
        }
      />
      {payable ? (
        <PaymentChoice
          total={b.total_amount}
          initialMode={mode}
          customer={{ name: b.contact.full_name, email: b.contact.email }}
          backHref={back}
          onRecordOffline={async ({ note, ...payment }) => {
            await recordOfficePayment(b.id, payment);
            if (note) await addBookingNote(b.id, note).catch(() => {});
            router.push(back);
          }}
          onSendLink={async () => ({ link: await issuePaymentLink(b.id), bookingId: b.id })}
        />
      ) : (
        <div className="mt-[24px]">
          <p className="text-[14px] leading-[22px]" style={{ color: BODY }}>
            {b.source !== "office"
              ? "Online bookings are paid through checkout, so payments can't be recorded here."
              : `This booking is ${bookingStatusLabel(b.status).toLowerCase()}, so it doesn't take a payment.`}
          </p>
          <Link href={back} className={`${smallOutline} mt-[18px] w-fit`} style={OUTLINE_STYLE}>
            Back to booking
          </Link>
        </div>
      )}
    </div>
  );
}
