"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import {
  AccountHeading,
  AccountNotice,
  type AccountHeadingProps,
  Card,
  MetaLines,
  primaryButtonClass,
  primaryButtonStyle,
  secondaryButtonClass,
} from "@/features/user/account/components/account-ui";
import { QueryFallback } from "@/features/user/account/components/query-fallback";
import { todayInKerala } from "@/features/user/account/utils/account-format";
import { CANCELLATION_STATUS_LABELS } from "@/features/user/cancellations/utils/cancellation-view";
import { userRoutes } from "@/constants/routes";
import { useApiQuery } from "@/hooks/use-api-query";
import { listMyCancellations } from "@/services/user/cancellations.service";
import { listMyBookings, type CustomerBooking } from "@/services/user/customer-bookings.service";
import { listMyEnquiries } from "@/services/user/enquiries.service";
import { getMyProfile } from "@/services/user/profile.service";

import { groupBookings } from "../utils/booking-view";

import { BookingCard } from "./booking-card";
import { BookingsTabs, type BookingsTabsProps } from "./bookings-tabs";
import { CancelledJourneyCard, PastJourneyCard } from "./past-journey-cards";

function loadBookings(signal: AbortSignal) {
  return Promise.all([
    getMyProfile(signal),
    listMyBookings(signal),
    listMyEnquiries(signal),
    listMyCancellations(signal),
  ]);
}
type BookingsData = Awaited<ReturnType<typeof loadBookings>>;

const isCancelled = (booking: CustomerBooking) =>
  booking.status === "cancelled" || booking.status === "refunded";

/* Each view's heading and tabs, as in its Figma frame. */

const UPCOMING_TABS: BookingsTabsProps = { current: "upcoming" };
const PAST_TABS: BookingsTabsProps = { current: "past", tabs: ["past", "upcoming"] };

const HEADINGS = {
  /** C17 */
  upcoming: (firstName?: string): AccountHeadingProps => ({
    heading: "Your next",
    headingSerif: "horizon.",
    subtitle: `Welcome back${firstName ? `, ${firstName}` : ""}. Everything for your time on the water.`,
  }),
  /** C37 */
  upcomingEmpty: {
    heading: "Your first horizon",
    headingSerif: "is waiting.",
    subtitle: "Your upcoming journeys will appear here once confirmed.",
  },
  /** C18 */
  past: {
    heading: "Journeys worth",
    headingSerif: "remembering.",
    subtitle: "Your previous time on the water, together in one place.",
  },
  /** C50 */
  pastWithCancelled: {
    heading: "Your journeys,",
    headingSerif: "all together.",
    subtitle: "Completed and cancelled charters, with their payment records kept separately.",
  },
} satisfies Record<string, AccountHeadingProps | ((name?: string) => AccountHeadingProps)>;

/**
 * "My bookings": upcoming charters (Figma C17, empty C37) or past journeys
 * (C18; C50 once a booking was cancelled). Heading and tabs depend on the data.
 */
export function MyBookings({ tab }: { tab: "upcoming" | "past" }) {
  const query = useApiQuery(loadBookings, "my-bookings");

  if (!query.data) {
    return (
      <>
        <AccountHeading {...(tab === "upcoming" ? HEADINGS.upcoming() : HEADINGS.past)} />
        <BookingsTabs {...(tab === "upcoming" ? UPCOMING_TABS : PAST_TABS)} />
        <QueryFallback query={query} loadingLabel="Loading your bookings" />
      </>
    );
  }

  return tab === "upcoming" ? (
    <UpcomingBookings data={query.data} />
  ) : (
    <PastBookings data={query.data} />
  );
}

function UpcomingBookings({ data }: { data: BookingsData }) {
  const [profile, bookings, enquiries, cancellations] = data;
  const { upcoming } = groupBookings(bookings, todayInKerala());
  const proposal = enquiries.find((enquiry) => enquiry.status === "proposal_ready");
  const firstName = profile.full_name.trim().split(/\s+/)[0];

  return (
    <>
      <AccountHeading
        {...(upcoming.length ? HEADINGS.upcoming(firstName) : HEADINGS.upcomingEmpty)}
      />
      <BookingsTabs {...UPCOMING_TABS} />

      <div className="mt-6 space-y-5 lg:mt-8">
        {upcoming.length === 0 ? (
          <>
            <Card title="There is time for something wonderful.">
              <MetaLines
                lines={["Explore the collection or begin a conversation with our concierge."]}
              />
            </Card>
            <div className="flex flex-col items-start gap-4 sm:flex-row">
              <Link
                href={userRoutes.yachts}
                className={primaryButtonClass}
                style={primaryButtonStyle}
              >
                Explore the yachts
                <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
              </Link>
              <Link href={userRoutes.planCharter} className={secondaryButtonClass}>
                Plan your charter
              </Link>
            </div>
          </>
        ) : (
          upcoming.map((booking, index) => {
            const cancellation = cancellations.find((item) => item.booking_id === booking.id);
            return (
              <BookingCard
                key={booking.id}
                booking={booking}
                isFirst={index === 0}
                actionLabel="View your charter"
                status={
                  cancellation?.status === "requested"
                    ? CANCELLATION_STATUS_LABELS.requested
                    : undefined
                }
              />
            );
          })
        )}

        {proposal ? (
          <>
            <AccountNotice label="A personal proposal awaits">
              Your enquiry {proposal.reference} has a proposal ready to review.
            </AccountNotice>
            <Link href={userRoutes.accountEnquiries} className={secondaryButtonClass}>
              Review proposal
            </Link>
          </>
        ) : null}
      </div>
    </>
  );
}

function PastBookings({ data }: { data: BookingsData }) {
  const [, bookings, , cancellations] = data;
  const { past } = groupBookings(bookings, todayInKerala());
  const cancelled = past.filter(isCancelled);
  const completed = past.filter((booking) => !isCancelled(booking));

  // C50: cancelled charters first; earlier charters stay one link away.
  if (cancelled.length > 0) {
    return (
      <>
        <AccountHeading {...HEADINGS.pastWithCancelled} />
        <BookingsTabs {...PAST_TABS} labels={{ past: "Past & cancelled" }} activeTone="dark" />
        <div className="mt-6 space-y-5 lg:mt-8">
          {cancelled.map((booking) => (
            <CancelledJourneyCard
              key={booking.id}
              booking={booking}
              cancellation={cancellations.find((item) => item.booking_id === booking.id) ?? null}
            />
          ))}
        </div>
        <div className="mt-6 flex flex-col items-start gap-6 lg:mt-8">
          {completed.map((booking) => (
            <Link
              key={booking.id}
              href={userRoutes.accountBooking(booking.id)}
              className={secondaryButtonClass}
            >
              View previous {booking.yacht.name} charter
            </Link>
          ))}
          <Link
            href={userRoutes.planCharter}
            className={primaryButtonClass}
            style={primaryButtonStyle}
          >
            Plan a new journey
          </Link>
        </div>
      </>
    );
  }

  // C18
  return (
    <>
      <AccountHeading {...HEADINGS.past} />
      <BookingsTabs {...PAST_TABS} />
      <div className="mt-6 space-y-5 lg:mt-8">
        {completed.map((booking) => (
          <PastJourneyCard key={booking.id} booking={booking} />
        ))}
        <Card
          title={completed.length ? "Your next chapter begins here." : "Your first chapter awaits."}
        >
          <MetaLines lines={["When you are ready, we will help you find a new horizon."]} />
        </Card>
        <Link href={userRoutes.yachts} className={primaryButtonClass} style={primaryButtonStyle}>
          Explore the yachts
          <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
        </Link>
      </div>
    </>
  );
}
