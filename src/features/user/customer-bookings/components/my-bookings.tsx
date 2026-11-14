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
import { CANCELLATION_STATUS_LABELS } from "@/features/user/cancellations/utils/cancellation-view";
import { userRoutes } from "@/constants/routes";
import { useApiQuery } from "@/hooks/use-api-query";
import { listMyCancellationRequests } from "@/services/user/cancellations.service";
import { getMyBooking, listMyBookings } from "@/services/user/customer-bookings.service";
import { listMyEnquiries } from "@/services/user/enquiries.service";
import { getMyProfile } from "@/services/user/profile.service";

import { isCancelled } from "../utils/booking-view";

import { BookingCard } from "./booking-card";
import { BookingsTabs, type BookingsTabsProps } from "./bookings-tabs";
import { CancelledJourneyCard, PastJourneyCard } from "./past-journey-cards";

/** Upcoming: the bookings, the greeting's name, a ready proposal, pending cancellation requests. */
async function loadUpcoming(signal: AbortSignal) {
  const [profile, bookings, enquiries, pendingRequests] = await Promise.all([
    getMyProfile(signal),
    listMyBookings("upcoming", signal),
    listMyEnquiries(signal),
    listMyCancellationRequests("pending", signal),
  ]);
  return { profile, bookings: bookings.items, enquiries, pendingRequests };
}

/** Past: the bookings, and the detail (refund records) of each cancelled one. */
async function loadPast(signal: AbortSignal) {
  const { items } = await listMyBookings("past", signal);
  const cancelled = await Promise.all(
    items
      .filter((booking) => isCancelled(booking.status))
      .map((booking) => getMyBooking(booking.reference, signal)),
  );
  return { completed: items.filter((booking) => !isCancelled(booking.status)), cancelled };
}

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
  return tab === "upcoming" ? <UpcomingBookings /> : <PastBookings />;
}

function UpcomingBookings() {
  const query = useApiQuery(loadUpcoming, "my-bookings:upcoming");

  if (!query.data) {
    return (
      <>
        <AccountHeading {...HEADINGS.upcoming()} />
        <BookingsTabs {...UPCOMING_TABS} />
        <QueryFallback query={query} loadingLabel="Loading your bookings" />
      </>
    );
  }

  const { profile, bookings, enquiries, pendingRequests } = query.data;
  const proposal = enquiries.find((enquiry) => enquiry.status === "proposal_sent");
  const firstName = profile.fullName.trim().split(/\s+/)[0];

  return (
    <>
      <AccountHeading
        {...(bookings.length ? HEADINGS.upcoming(firstName) : HEADINGS.upcomingEmpty)}
      />
      <BookingsTabs {...UPCOMING_TABS} />

      <div className="mt-6 space-y-5 lg:mt-8">
        {bookings.length === 0 ? (
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
          bookings.map((booking, index) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              isFirst={index === 0}
              actionLabel="View your charter"
              status={
                pendingRequests.some((request) => request.booking_reference === booking.reference)
                  ? CANCELLATION_STATUS_LABELS.pending
                  : undefined
              }
            />
          ))
        )}

        {proposal ? (
          <>
            <AccountNotice label="A personal proposal awaits">
              Your enquiry {proposal.reference} has a proposal ready to review.
            </AccountNotice>
            <Link
              href={userRoutes.accountEnquiry(proposal.reference)}
              className={secondaryButtonClass}
            >
              Review proposal
            </Link>
          </>
        ) : null}
      </div>
    </>
  );
}

function PastBookings() {
  const query = useApiQuery(loadPast, "my-bookings:past");

  if (!query.data) {
    return (
      <>
        <AccountHeading {...HEADINGS.past} />
        <BookingsTabs {...PAST_TABS} />
        <QueryFallback query={query} loadingLabel="Loading your journeys" />
      </>
    );
  }

  const { completed, cancelled } = query.data;

  // C50: cancelled charters first; earlier charters stay one link away.
  if (cancelled.length > 0) {
    return (
      <>
        <AccountHeading {...HEADINGS.pastWithCancelled} />
        <BookingsTabs {...PAST_TABS} labels={{ past: "Past & cancelled" }} activeTone="dark" />
        <div className="mt-6 space-y-5 lg:mt-8">
          {cancelled.map((booking) => (
            <CancelledJourneyCard key={booking.id} booking={booking} />
          ))}
        </div>
        <div className="mt-6 flex flex-col items-start gap-6 lg:mt-8">
          {completed.map((booking) => (
            <Link
              key={booking.id}
              href={userRoutes.accountBooking(booking.reference)}
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
