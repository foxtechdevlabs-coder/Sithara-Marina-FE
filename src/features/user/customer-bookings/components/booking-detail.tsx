"use client";

import Image from "next/image";
import Link from "next/link";

import { CharterSummaryCard } from "@/components/user/charter-summary-card";
import { SERIF } from "@/components/user/marina-chrome";
import {
  AccountHeading,
  AccountNotice,
  buttonRowClass,
  Card,
  DetailRows,
  MetaLines,
  primaryButtonClass,
  primaryButtonStyle,
  secondaryButtonClass,
  StatusChip,
  StepList,
  textButtonClass,
} from "@/features/user/account/components/account-ui";
import { QueryFallback } from "@/features/user/account/components/query-fallback";
import {
  formatAmount,
  formatDayMonth,
  formatHours,
  formatLongDate,
  formatTimeRange,
  guests,
  todayInKerala,
} from "@/features/user/account/utils/account-format";
import { CANCELLATION_STATUS_LABELS } from "@/features/user/cancellations/utils/cancellation-view";
import { userRoutes } from "@/constants/routes";
import { useApiQuery } from "@/hooks/use-api-query";
import { listMyCancellations, type Cancellation } from "@/services/user/cancellations.service";
import { getMyBooking, type CustomerBooking } from "@/services/user/customer-bookings.service";

import { CUSTOMER_STATUS_LABELS, isUpcoming } from "../utils/booking-view";

async function loadBooking(bookingId: string, signal: AbortSignal) {
  const [booking, cancellations] = await Promise.all([
    getMyBooking(bookingId, signal),
    listMyCancellations(signal),
  ]);
  return {
    booking,
    cancellation: cancellations.find((item) => item.booking_id === bookingId) ?? null,
  };
}

/** "Astra One" with its second word in the serif face, as in the Figma. */
function YachtName({ name, className }: { name: string; className?: string }) {
  const [first, ...rest] = name.split(" ");
  return (
    <h2 className={className}>
      {first}
      {rest.length ? (
        <>
          {" "}
          <span style={SERIF}>{rest.join(" ")}</span>
        </>
      ) : null}
    </h2>
  );
}

const nameClass =
  "text-navy-ink text-[1.75rem] leading-tight font-normal tracking-[-0.01em] lg:text-[2rem]";

/**
 * A booking in the account: Figma C19 "Every detail, for your journey." while
 * it is ahead, C35 "A journey worth remembering." once it has passed.
 */
export function BookingDetail({ bookingId }: { bookingId: string }) {
  const query = useApiQuery((signal) => loadBooking(bookingId, signal), bookingId);

  if (!query.data) {
    return (
      <>
        <AccountHeading heading="Your" headingSerif="booking." />
        <QueryFallback
          query={query}
          loadingLabel="Loading your booking"
          notFoundMessage="We couldn’t find this booking in your account."
        />
      </>
    );
  }

  const { booking, cancellation } = query.data;
  return isUpcoming(booking, todayInKerala()) ? (
    <UpcomingBooking booking={booking} cancellation={cancellation} />
  ) : (
    <PastBooking booking={booking} cancellation={cancellation} />
  );
}

interface BodyProps {
  booking: CustomerBooking;
  cancellation: Cancellation | null;
}

/** Figma C19: details and preparation on the left, the navy charter card on the right. */
function UpcomingBooking({ booking, cancellation }: BodyProps) {
  const statusLabel = CUSTOMER_STATUS_LABELS[booking.status].split(" · ")[0];
  const isPaid = booking.status === "confirmed";
  const timeRange = formatTimeRange(booking.start_time, booking.end_time);
  const amount = (value: number) => formatAmount(value, booking.currency);
  const isUnderReview = cancellation?.status === "requested";

  return (
    <>
      <AccountHeading
        heading="Every detail,"
        headingSerif="for your journey."
        subtitle={`Booking ${booking.reference} · ${isUnderReview ? CANCELLATION_STATUS_LABELS.requested : statusLabel}`}
      />

      <div className="mt-8 grid gap-10 lg:mt-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,21.5rem)] xl:gap-8">
        <article className="min-w-0">
          {booking.yacht.image_url ? (
            <div className="bg-pearl relative aspect-[16/10] w-full overflow-hidden sm:aspect-[1.8/1]">
              <Image
                src={booking.yacht.image_url}
                alt={`${booking.yacht.name} at sea`}
                fill
                preload
                sizes="(min-width: 1280px) 40vw, (min-width: 1024px) 60vw, 100vw"
                className="object-cover"
              />
            </div>
          ) : null}

          <YachtName name={booking.yacht.name} className={`${nameClass} mt-7 lg:mt-9`} />
          <DetailRows
            className="mt-6"
            rows={[
              { label: "Departure", value: formatLongDate(booking.date) },
              { label: "Charter time", value: `${timeRange} · ${booking.time_zone}` },
              { label: "Your company", value: guests(booking.guest_count) },
              { label: "Lead guest", value: booking.lead_guest },
              ...(booking.on_board ? [{ label: "On board", value: booking.on_board }] : []),
            ]}
          />

          <Card title="Before you come aboard" className="mt-7">
            <MetaLines
              lines={[
                "Review your meeting point and boarding instructions in the confirmed itinerary. Contact our concierge for dietary or arrival arrangements.",
              ]}
            />
          </Card>

          <StepList
            className="mt-7"
            steps={[
              isPaid
                ? { label: "Booking confirmed", detail: "Payment verified · Confirmation sent" }
                : { label: "Booking received", detail: "Awaiting payment" },
              {
                label: "Prepare for your charter",
                detail: "Review your itinerary and guest details",
              },
              {
                label: "Your time on the water",
                detail: `${formatDayMonth(booking.date)} · ${timeRange}`,
              },
            ]}
          />
        </article>

        <div className="min-w-0">
          <CharterSummaryCard
            tone="dark"
            yachtName={booking.yacht.name}
            subtitle={`${booking.departure} · ${booking.service}`}
            imageUrl={booking.yacht.image_url}
            facts={[
              { label: "Departure", value: formatLongDate(booking.date) },
              { label: "Time", value: `${timeRange} · ${formatHours(booking.duration_minutes)}` },
              {
                label: "Your company",
                value: `${guests(booking.guest_count)} · up to ${booking.capacity}`,
              },
            ]}
            prices={booking.price_lines.map((line) => ({
              label: line.label,
              value: amount(line.amount),
            }))}
            total={amount(booking.total_amount)}
          />

          {isUnderReview ? (
            <AccountNotice label="Cancellation under review" className="mt-5">
              Your request {cancellation.reference} is with our team. Your booking stays as it is
              until the outcome is confirmed.
            </AccountNotice>
          ) : null}

          <div className="mt-5 flex flex-col items-start gap-4">
            {booking.invoice_number ? (
              <Link
                href={userRoutes.accountBookingInvoice(booking.id)}
                className={primaryButtonClass}
                style={primaryButtonStyle}
              >
                View invoice
              </Link>
            ) : null}
            {cancellation ? (
              <Link
                href={userRoutes.accountBookingCancelConfirmed(booking.id)}
                className={secondaryButtonClass}
              >
                View cancellation status
              </Link>
            ) : booking.can_cancel ? (
              <Link
                href={userRoutes.accountBookingCancel(booking.id)}
                className={secondaryButtonClass}
              >
                Request cancellation
              </Link>
            ) : null}
            <Link href={userRoutes.accountHelpFor(booking.id)} className={textButtonClass}>
              Speak to our concierge
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

/** Figma C35: the photo, the essentials and the invoice of a past charter. */
function PastBooking({ booking, cancellation }: BodyProps) {
  const statusLabel = CUSTOMER_STATUS_LABELS[booking.status].split(" · ")[0];

  return (
    <>
      <AccountHeading
        heading="A journey worth"
        headingSerif="remembering."
        subtitle={`Booking ${booking.reference} · ${statusLabel}`}
      />

      <article className="mt-8 lg:mt-10">
        {booking.yacht.image_url ? (
          <div className="bg-pearl relative aspect-[4/3] w-full overflow-hidden sm:aspect-[2.5/1]">
            <Image
              src={booking.yacht.image_url}
              alt={`${booking.yacht.name} at anchor`}
              fill
              preload
              sizes="(min-width: 1024px) 65vw, 100vw"
              className="object-cover"
            />
          </div>
        ) : null}

        <YachtName name={booking.yacht.name} className={`${nameClass} mt-7 lg:mt-9`} />
        <DetailRows
          className="mt-6"
          rows={[
            { label: "Departure", value: formatLongDate(booking.date) },
            {
              label: "Charter",
              value: `${formatTimeRange(booking.start_time, booking.end_time)} · ${booking.departure} · ${guests(booking.guest_count)}`,
            },
            { label: "Lead guest", value: booking.lead_guest },
          ]}
        />
        <StatusChip className="mt-6">{CUSTOMER_STATUS_LABELS[booking.status]}</StatusChip>

        <div className={`${buttonRowClass} mt-6`}>
          {booking.invoice_number ? (
            <Link
              href={userRoutes.accountBookingInvoice(booking.id)}
              className={primaryButtonClass}
              style={primaryButtonStyle}
            >
              View this invoice
            </Link>
          ) : null}
          {cancellation ? (
            <Link
              href={
                cancellation.refund
                  ? userRoutes.accountBookingRefund(booking.id)
                  : userRoutes.accountBookingCancelConfirmed(booking.id)
              }
              className={secondaryButtonClass}
            >
              View cancellation and refund
            </Link>
          ) : null}
          <Link href={userRoutes.accountPastBookings} className={secondaryButtonClass}>
            Back to past journeys
          </Link>
        </div>
        <Link href={userRoutes.yachts} className={`${textButtonClass} mt-4`}>
          Plan another charter
        </Link>
      </article>
    </>
  );
}
