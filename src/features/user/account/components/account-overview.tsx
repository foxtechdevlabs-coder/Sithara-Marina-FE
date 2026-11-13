"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { userRoutes } from "@/constants/routes";
import {
  CUSTOMER_STATUS_LABELS,
  openEnquiries,
} from "@/features/user/customer-bookings/utils/booking-view";
import { useApiQuery } from "@/hooks/use-api-query";
import { listMyBookings } from "@/services/user/customer-bookings.service";
import { listMyEnquiries } from "@/services/user/enquiries.service";
import { getMyProfile } from "@/services/user/profile.service";

import { formatDayMonth, formatLongDate, formatTimeRange, guests } from "../utils/account-format";

import {
  AccountHeading,
  AccountNotice,
  buttonRowClass,
  Card,
  MetaLines,
  primaryButtonClass,
  primaryButtonStyle,
  secondaryButtonClass,
  StatusChip,
} from "./account-ui";
import { QueryFallback } from "./query-fallback";

async function loadOverview(signal: AbortSignal) {
  const [profile, upcoming, past, enquiries] = await Promise.all([
    getMyProfile(signal),
    listMyBookings("upcoming", signal),
    listMyBookings("past", signal),
    listMyEnquiries(signal),
  ]);
  return { profile, upcoming, past, enquiries };
}

function StatCard({ title, detail, count }: { title: string; detail: string; count: number }) {
  return (
    <Card as="div" className="min-h-[9.5rem]">
      <h2 className="text-navy-ink text-[1.375rem] leading-snug lg:text-[1.5rem]">{title}</h2>
      <p className="text-body mt-2 text-[12px]">{detail}</p>
      <p className="text-navy-ink mt-4 text-[2.25rem] leading-none">{count}</p>
    </Card>
  );
}

/** Figma C51 "Your account, thoughtfully arranged.": counts, next charter, details, proposal. */
export function AccountOverview() {
  const query = useApiQuery(loadOverview, "account-overview");
  const firstName = query.data?.profile.fullName.trim().split(/\s+/)[0];

  return (
    <>
      <AccountHeading
        heading="Your account,"
        headingSerif="thoughtfully arranged."
        subtitle={`Welcome${firstName ? `, ${firstName}` : ""}. Your journeys and personal details, in one place.`}
      />
      {query.data ? (
        <OverviewBody data={query.data} />
      ) : (
        <QueryFallback query={query} loadingLabel="Loading your account" />
      )}
    </>
  );
}

function OverviewBody({ data }: { data: Awaited<ReturnType<typeof loadOverview>> }) {
  const { profile, upcoming, past, enquiries } = data;
  const next = upcoming.items[0];
  const last = past.items[0];
  const open = openEnquiries(enquiries);
  const proposal = open.find((enquiry) => enquiry.status === "proposal_sent");

  return (
    <div className="mt-8 space-y-5 lg:mt-10">
      <div className="grid gap-5 md:grid-cols-3">
        <StatCard
          title="Upcoming charter"
          detail={
            next ? `${next.yacht.name} · ${formatDayMonth(next.date)}` : "Nothing planned yet"
          }
          count={upcoming.total}
        />
        <StatCard
          title="Past journey"
          detail={last ? `${last.yacht.name} · ${formatDayMonth(last.date)}` : "Your first awaits"}
          count={past.total}
        />
        <StatCard
          title="Open enquiry"
          detail={
            proposal
              ? "A personal proposal awaits"
              : open.length
                ? "We are preparing your proposal"
                : "No open enquiries"
          }
          count={open.length}
        />
      </div>

      <Card title="Your next time on the water">
        {next ? (
          <>
            <MetaLines
              lines={[
                `${next.yacht.name} · ${formatLongDate(next.date)}`,
                `${formatTimeRange(next.start_time, next.end_time)} · ${guests(next.guest_count)}`,
                next.reference,
              ]}
            />
            <StatusChip className="mt-3">{CUSTOMER_STATUS_LABELS[next.status]}</StatusChip>
          </>
        ) : (
          <MetaLines lines={["No charter is planned yet. Our fleet is ready when you are."]} />
        )}
        <div className={`${buttonRowClass} mt-2`}>
          {next ? (
            <Link
              href={userRoutes.accountBooking(next.reference)}
              className={primaryButtonClass}
              style={primaryButtonStyle}
            >
              View booking
              <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
            </Link>
          ) : (
            <Link
              href={userRoutes.yachts}
              className={primaryButtonClass}
              style={primaryButtonStyle}
            >
              Explore the yachts
              <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
            </Link>
          )}
          <Link href={userRoutes.accountBookings} className={secondaryButtonClass}>
            All my bookings
          </Link>
        </div>
      </Card>

      <Card title="Your personal details">
        <MetaLines
          lines={[profile.fullName, profile.email, profile.phone ?? "No phone number yet"]}
        />
        <Link href={userRoutes.accountProfile} className={`${secondaryButtonClass} mt-4`}>
          Edit profile
        </Link>
      </Card>

      {proposal ? (
        <>
          <AccountNotice label="A proposal ready for you">
            Your {proposal.yacht.name} proposal, {proposal.reference}, is ready to review.
          </AccountNotice>
          <Link
            href={userRoutes.accountEnquiry(proposal.reference)}
            className={secondaryButtonClass}
          >
            Review enquiry &amp; proposal
          </Link>
        </>
      ) : null}
    </div>
  );
}
