"use client";

import Link from "next/link";

import {
  AccountNotice,
  Card,
  MetaLines,
  primaryButtonClass,
  primaryButtonStyle,
  StatusChip,
} from "@/features/user/account/components/account-ui";
import { QueryFallback } from "@/features/user/account/components/query-fallback";
import { formatLongDate, guests } from "@/features/user/account/utils/account-format";
import { ENQUIRY_STATUS_LABELS } from "@/features/user/customer-bookings/utils/booking-view";
import { userRoutes } from "@/constants/routes";
import { useApiQuery } from "@/hooks/use-api-query";
import { listMyEnquiries, type Enquiry } from "@/services/user/enquiries.service";

function enquiryLines(enquiry: Enquiry): string[] {
  const details = [
    enquiry.preferred_date ? `Preferred date ${formatLongDate(enquiry.preferred_date)}` : null,
    guests(enquiry.guest_count),
    enquiry.occasion,
  ].filter(Boolean);
  return [details.join(" · "), `Sent ${formatLongDate(enquiry.submitted_on)}`];
}

/** The customer's charter enquiries, newest first, with their proposal status. */
export function MyEnquiries() {
  const query = useApiQuery(listMyEnquiries, "my-enquiries");

  if (!query.data) {
    return <QueryFallback query={query} loadingLabel="Loading your enquiries" />;
  }

  const enquiries = [...query.data].sort((a, b) => b.submitted_on.localeCompare(a.submitted_on));

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
      {enquiries.map((enquiry) => (
        <Card
          key={enquiry.id}
          as="article"
          title={
            <>
              {enquiry.yacht_name ?? "Your charter"}&nbsp;·&nbsp;{enquiry.reference}
            </>
          }
        >
          <MetaLines lines={enquiryLines(enquiry)} />
          <StatusChip
            className="mt-3"
            tone={enquiry.status === "proposal_ready" ? "forest" : "pearl"}
          >
            {ENQUIRY_STATUS_LABELS[enquiry.status]}
          </StatusChip>
          {enquiry.status === "proposal_ready" ? (
            <AccountNotice label="A personal proposal awaits" className="mt-5">
              Your proposal for {enquiry.reference} is ready to review with our concierge. Call{" "}
              <a href="tel:+919724553452" className="underline underline-offset-2">
                +91 97245 53452
              </a>{" "}
              or write to{" "}
              <a href="mailto:sitharamarina@gmail.com" className="underline underline-offset-2">
                sitharamarina@gmail.com
              </a>{" "}
              to confirm or adjust it.
            </AccountNotice>
          ) : null}
        </Card>
      ))}
    </div>
  );
}
