"use client";

import Link from "next/link";

import {
  AccountNotice,
  Card,
  MetaLines,
  primaryButtonClass,
  primaryButtonStyle,
  secondaryButtonClass,
  StatusChip,
} from "@/features/user/account/components/account-ui";
import { QueryFallback } from "@/features/user/account/components/query-fallback";
import { formatInstantDate } from "@/features/user/account/utils/account-format";
import { ENQUIRY_STATUS_LABELS } from "@/features/user/customer-bookings/utils/booking-view";
import { userRoutes } from "@/constants/routes";
import { useApiQuery } from "@/hooks/use-api-query";
import { listMyEnquiries } from "@/services/user/enquiries.service";

import { enquiryLine } from "../utils/enquiry-view";

/** The customer's charter enquiries (GET /me/enquiries), newest first, with their status. */
export function MyEnquiries() {
  const query = useApiQuery(listMyEnquiries, "my-enquiries");

  if (!query.data) {
    return <QueryFallback query={query} loadingLabel="Loading your enquiries" />;
  }

  const enquiries = [...query.data].sort((a, b) => b.created_at.localeCompare(a.created_at));

  if (enquiries.length === 0) {
    return (
      <Card title="No enquiries yet" className="mt-6 lg:mt-8">
        <MetaLines
          lines={["Tell us about the journey you have in mind and we will prepare a proposal."]}
        />
        <Link
          href={userRoutes.planCharter}
          className={`${primaryButtonClass} mt-4`}
          style={primaryButtonStyle}
        >
          Plan your charter
        </Link>
      </Card>
    );
  }

  return (
    <div className="mt-6 space-y-5 lg:mt-8">
      {enquiries.map((enquiry) => {
        const hasProposal = enquiry.status === "proposal_sent";
        return (
          <Card
            key={enquiry.id}
            as="article"
            title={
              <>
                {enquiry.yacht.name}&nbsp;·&nbsp;{enquiry.reference}
              </>
            }
          >
            <MetaLines
              lines={[enquiryLine(enquiry), `Sent ${formatInstantDate(enquiry.created_at)}`]}
            />
            <StatusChip className="mt-3" tone={hasProposal ? "forest" : "pearl"}>
              {ENQUIRY_STATUS_LABELS[enquiry.status]}
            </StatusChip>
            {hasProposal ? (
              <AccountNotice label="A personal proposal awaits" className="mt-5">
                Your proposal for {enquiry.reference} is ready to review.
              </AccountNotice>
            ) : null}
            <Link
              href={userRoutes.accountEnquiry(enquiry.reference)}
              className={`${hasProposal ? primaryButtonClass : secondaryButtonClass} mt-4`}
              style={hasProposal ? primaryButtonStyle : undefined}
            >
              {hasProposal ? "Review proposal" : "View enquiry"}
            </Link>
          </Card>
        );
      })}
    </div>
  );
}
