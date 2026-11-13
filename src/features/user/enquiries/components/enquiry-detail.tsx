"use client";

import Link from "next/link";

import {
  AccountHeading,
  AccountNotice,
  Card,
  CardTitle,
  DetailRows,
  MetaLines,
  primaryButtonClass,
  primaryButtonStyle,
  secondaryButtonClass,
  StatusChip,
} from "@/features/user/account/components/account-ui";
import { QueryFallback } from "@/features/user/account/components/query-fallback";
import {
  formatInstantDate,
  formatLongDate,
  guests,
} from "@/features/user/account/utils/account-format";
import { ENQUIRY_STATUS_LABELS } from "@/features/user/customer-bookings/utils/booking-view";
import { userRoutes } from "@/constants/routes";
import { useApiQuery } from "@/hooks/use-api-query";
import { getMyEnquiry } from "@/services/user/enquiries.service";

import { PROPOSAL_STATUS_LABELS, proposalLine, proposalTotal } from "../utils/enquiry-view";

const HEADING = { heading: "Your enquiry,", headingSerif: "in detail." };

/** An enquiry and the proposals sent for it (GET /me/enquiries/{ref}). */
export function EnquiryDetail({ reference }: { reference: string }) {
  const query = useApiQuery((signal) => getMyEnquiry(reference, signal), reference);
  const enquiry = query.data;

  if (!enquiry) {
    return (
      <>
        <AccountHeading {...HEADING} />
        <QueryFallback
          query={query}
          loadingLabel="Loading your enquiry"
          notFoundMessage="We couldn’t find this enquiry in your account."
        />
      </>
    );
  }

  return (
    <>
      <AccountHeading
        {...HEADING}
        subtitle={`Enquiry ${enquiry.reference} · ${ENQUIRY_STATUS_LABELS[enquiry.status]}`}
      />

      <DetailRows
        className="mt-8 lg:mt-10"
        rows={[
          { label: "Yacht", value: enquiry.yacht.name },
          { label: "Charter", value: enquiry.slot_type.name },
          {
            label: "Preferred date",
            value: enquiry.preferred_date
              ? [formatLongDate(enquiry.preferred_date), enquiry.preferred_start_time]
                  .filter(Boolean)
                  .join(" · ")
              : "Flexible",
          },
          ...(enquiry.guests ? [{ label: "Your company", value: guests(enquiry.guests) }] : []),
          ...(enquiry.message ? [{ label: "Your message", value: enquiry.message }] : []),
          { label: "Sent", value: formatInstantDate(enquiry.created_at) },
        ]}
      />

      <section aria-labelledby="enquiry-proposals" className="mt-10 lg:mt-12">
        <CardTitle>
          <span id="enquiry-proposals">Proposals for you</span>
        </CardTitle>
        {enquiry.proposals.length === 0 ? (
          <AccountNotice label="Being prepared" className="mt-5">
            Our concierge is preparing a proposal for this enquiry. We will email you as soon as it
            is ready.
          </AccountNotice>
        ) : (
          <ul className="mt-5 space-y-5">
            {enquiry.proposals.map((proposal) => {
              const isOpen = proposal.status === "sent";
              const total = proposalTotal(proposal);
              return (
                <li key={proposal.id}>
                  <Card as="article">
                    <CardTitle>
                      {proposal.yacht.name}&nbsp;·&nbsp;Proposal {proposal.version}
                    </CardTitle>
                    <MetaLines
                      lines={[
                        proposalLine(proposal),
                        ...(total ? [`Total ${total}`] : []),
                        ...(isOpen && proposal.expires_at
                          ? [`Open until ${formatInstantDate(proposal.expires_at)}`]
                          : []),
                      ]}
                    />
                    <StatusChip className="mt-3" tone={isOpen ? "forest" : "pearl"}>
                      {PROPOSAL_STATUS_LABELS[proposal.status]}
                    </StatusChip>
                    <Link
                      href={userRoutes.accountProposal(proposal.id)}
                      className={`${isOpen ? primaryButtonClass : secondaryButtonClass} mt-4`}
                      style={isOpen ? primaryButtonStyle : undefined}
                    >
                      {isOpen ? "Review proposal" : "View proposal"}
                    </Link>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Link href={userRoutes.accountEnquiries} className={`${secondaryButtonClass} mt-8`}>
        Back to my enquiries
      </Link>
    </>
  );
}
