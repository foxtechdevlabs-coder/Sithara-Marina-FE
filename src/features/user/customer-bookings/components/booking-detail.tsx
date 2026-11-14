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
  minutesBetween,
} from "@/features/user/account/utils/account-format";
import { CANCELLATION_STATUS_LABELS } from "@/features/user/cancellations/utils/cancellation-view";
import { userRoutes } from "@/constants/routes";
import { useApiQuery } from "@/hooks/use-api-query";
import {
  getMyBooking,
  type BookingDetail as Booking,
} from "@/services/user/customer-bookings.service";

import { useYachtInfo, type YachtInfo } from "../hooks/use-yacht-info";
import { CUSTOMER_STATUS_LABELS, isUpcomingBooking, shortStatus } from "../utils/booking-view";

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

/** Booked extras, e.g. "Seasonal menu × 8"; null when none were added. */
const onBoard = (booking: Booking) =>
  booking.pricing.addons.length
    ? booking.pricing.addons
        .map((addon) => (addon.quantity > 1 ? `${addon.name} × ${addon.quantity}` : addon.name))
        .join(" · ")
    : null;

/**
 * A booking in the account (GET /me/bookings/{ref}): Figma C19 "Every detail,
 * for your journey." while it is ahead, C35 "A journey worth remembering." after.
 */
export function BookingDetail({ bookingRef }: { bookingRef: string }) {
  const query = useApiQuery((signal) => getMyBooking(bookingRef, signal), bookingRef);
  const yacht = useYachtInfo(query.data?.yacht.slug);

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

  return isUpcomingBooking(query.data) ? (
    <UpcomingBooking booking={query.data} yacht={yacht} />
  ) : (
    <PastBooking booking={query.data} yacht={yacht} />
  );
}

interface BodyProps {
  booking: Booking;
  yacht: YachtInfo | undefined;
}

function YachtPhoto({ booking, yacht, wide }: BodyProps & { wide?: boolean }) {
  if (!yacht?.imageUrl) return null;
  return (
    <div
      className={`bg-pearl relative w-full overflow-hidden ${wide ? "aspect-[4/3] sm:aspect-[2.5/1]" : "aspect-[16/10] sm:aspect-[1.8/1]"}`}
    >
      <Image
        src={yacht.imageUrl}
        alt={`${booking.yacht.name} at sea`}
        fill
        preload
        unoptimized
        sizes="(min-width: 1280px) 40vw, (min-width: 1024px) 60vw, 100vw"
        className="object-cover"
      />
    </div>
  );
}

/** Figma C19: details and preparation on the left, the navy charter card on the right. */
function UpcomingBooking({ booking, yacht }: BodyProps) {
  const { slot, pricing } = booking;
  const timeRange = formatTimeRange(slot.start_time, slot.end_time);
  const minutes = minutesBetween(slot.start_time, slot.end_time);
  const amount = (value: number) => formatAmount(value, pricing.currency);
  const request = booking.cancellation_request;
  const isUnderReview = request?.status === "pending";
  const extras = onBoard(booking);
  const hasInvoice = booking.invoice !== null;

  return (
    <>
      <AccountHeading
        heading="Every detail,"
        headingSerif="for your journey."
        subtitle={`Booking ${booking.reference} · ${isUnderReview ? CANCELLATION_STATUS_LABELS.pending : shortStatus(booking.status)}`}
      />

      <div className="mt-8 grid gap-10 lg:mt-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,21.5rem)] xl:gap-8">
        <article className="min-w-0">
          <YachtPhoto booking={booking} yacht={yacht} />

          <YachtName name={booking.yacht.name} className={`${nameClass} mt-7 lg:mt-9`} />
          <DetailRows
            className="mt-6"
            rows={[
              { label: "Departure", value: formatLongDate(slot.date) },
              { label: "Charter time", value: `${timeRange} · ${slot.time_zone}` },
              { label: "Your company", value: guests(booking.guest_count) },
              { label: "Lead guest", value: booking.contact.full_name },
              ...(extras ? [{ label: "On board", value: extras }] : []),
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
              booking.payment_status === "succeeded"
                ? { label: "Booking confirmed", detail: "Payment verified · Confirmation sent" }
                : { label: "Booking received", detail: "Awaiting payment" },
              {
                label: "Prepare for your charter",
                detail: "Review your itinerary and guest details",
              },
              {
                label: "Your time on the water",
                detail: `${formatDayMonth(slot.date)} · ${timeRange}`,
              },
            ]}
          />
        </article>

        <div className="min-w-0">
          <CharterSummaryCard
            tone="dark"
            yachtName={booking.yacht.name}
            subtitle={[yacht?.departureCity, slot.slot_type_name].filter(Boolean).join(" · ")}
            imageUrl={yacht?.imageUrl}
            facts={[
              { label: "Departure", value: formatLongDate(slot.date) },
              {
                label: "Time",
                value: minutes ? `${timeRange} · ${formatHours(minutes)}` : timeRange,
              },
              {
                label: "Your company",
                value: yacht
                  ? `${guests(booking.guest_count)} · up to ${yacht.capacity}`
                  : guests(booking.guest_count),
              },
            ]}
            prices={[
              ...(pricing.charter_amount === null
                ? []
                : [{ label: "Private charter", value: amount(pricing.charter_amount) }]),
              ...pricing.addons.map((addon) => ({
                label: addon.quantity > 1 ? `${addon.name} · ${addon.quantity}` : addon.name,
                value: amount(addon.amount),
              })),
              {
                label:
                  pricing.tax_rate === null
                    ? pricing.tax_label
                    : `${pricing.tax_label} (${pricing.tax_rate}%)`,
                value: amount(pricing.tax_amount),
              },
            ]}
            total={amount(pricing.total_amount)}
          />

          {isUnderReview ? (
            <AccountNotice label="Cancellation under review" className="mt-5">
              Your cancellation request is with our team. Your booking stays as it is until the
              outcome is confirmed.
            </AccountNotice>
          ) : null}

          <div className="mt-5 flex flex-col items-start gap-4">
            {hasInvoice ? (
              <Link
                href={userRoutes.accountBookingInvoice(booking.reference)}
                className={primaryButtonClass}
                style={primaryButtonStyle}
              >
                View invoice
              </Link>
            ) : null}
            {request ? (
              <Link
                href={userRoutes.accountBookingCancelConfirmed(booking.reference)}
                className={secondaryButtonClass}
              >
                View cancellation status
              </Link>
            ) : booking.can_request_cancellation ? (
              <Link
                href={userRoutes.accountBookingCancel(booking.reference)}
                className={secondaryButtonClass}
              >
                Request cancellation
              </Link>
            ) : null}
            <Link href={userRoutes.accountHelpFor(booking.reference)} className={textButtonClass}>
              Speak to our concierge
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

/** Figma C35: the photo, the essentials and the invoice of a past charter. */
function PastBooking({ booking, yacht }: BodyProps) {
  const { slot } = booking;
  const hasRefund = booking.refunds.length > 0 || booking.cancellation?.refund_amount;

  return (
    <>
      <AccountHeading
        heading="A journey worth"
        headingSerif="remembering."
        subtitle={`Booking ${booking.reference} · ${shortStatus(booking.status)}`}
      />

      <article className="mt-8 lg:mt-10">
        <YachtPhoto booking={booking} yacht={yacht} wide />

        <YachtName name={booking.yacht.name} className={`${nameClass} mt-7 lg:mt-9`} />
        <DetailRows
          className="mt-6"
          rows={[
            { label: "Departure", value: formatLongDate(slot.date) },
            {
              label: "Charter",
              value: [
                formatTimeRange(slot.start_time, slot.end_time),
                yacht?.departureCity,
                guests(booking.guest_count),
              ]
                .filter(Boolean)
                .join(" · "),
            },
            { label: "Lead guest", value: booking.contact.full_name },
          ]}
        />
        <StatusChip className="mt-6">{CUSTOMER_STATUS_LABELS[booking.status]}</StatusChip>

        <div className={`${buttonRowClass} mt-6`}>
          {booking.invoice ? (
            <Link
              href={userRoutes.accountBookingInvoice(booking.reference)}
              className={primaryButtonClass}
              style={primaryButtonStyle}
            >
              View this invoice
            </Link>
          ) : null}
          {booking.cancellation_request || hasRefund ? (
            <Link
              href={
                hasRefund
                  ? userRoutes.accountBookingRefund(booking.reference)
                  : userRoutes.accountBookingCancelConfirmed(booking.reference)
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
