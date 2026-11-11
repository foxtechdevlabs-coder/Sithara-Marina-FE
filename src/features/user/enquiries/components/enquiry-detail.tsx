"use client";

import Link from "next/link";

import { userRoutes } from "@/constants/routes";
import {
  Loading,
  Notice,
  SectionTitle,
  textLinkClass,
} from "@/features/user/checkout/components/checkout-ui";
import {
  AccountPage,
  DetailGrid,
  StatusPill,
} from "@/features/user/profile/components/account-ui";
import { accountErrorMessage } from "@/features/user/profile/utils/account-error-message";
import { useApiQuery } from "@/hooks/use-api-query";
import { getMyEnquiryDetails } from "@/services/user/enquiries.service";

import { enquiryFacts } from "./enquiry-list";
import { ENQUIRY_STATUS } from "./enquiry-labels";
import { ProposalCard } from "./proposal-card";

const NOT_FOUND = "We couldn’t find this enquiry on your account.";

/**
 * One enquiry and every proposal sent for it, from GET /me/enquiries/{ref}. A
 * decision reloads this one call, so the page shows the backend's new state.
 */
export function EnquiryDetail({ reference }: { reference: string }) {
  const detail = useApiQuery((signal) => getMyEnquiryDetails(reference, signal), reference);
  const data = detail.data;

  return (
    <AccountPage heading="Enquiry" headingSerif={reference} intro={undefined}>
      <Link href={userRoutes.accountEnquiries} className={`${textLinkClass} text-[14px]`}>
        All enquiries
      </Link>
      <div className="mt-[24px]" aria-busy={detail.loading}>
        {detail.loading && !data ? (
          <Loading label="Loading your enquiry" />
        ) : !data ? (
          <Notice alert>
            {accountErrorMessage(detail.error, "We couldn’t load this enquiry.", NOT_FOUND)}{" "}
            <button type="button" className={textLinkClass} onClick={detail.reload}>
              Try again
            </button>
          </Notice>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-[12px]">
              <StatusPill tone={ENQUIRY_STATUS[data.status].tone}>
                {ENQUIRY_STATUS[data.status].label}
              </StatusPill>
              <span className="text-[18px]">{data.yacht?.name ?? "Any yacht"}</span>
            </div>
            <div className="mt-[20px]">
              <DetailGrid items={enquiryFacts(data)} />
            </div>
            {data.message && (
              <p className="mt-[16px] max-w-[760px] text-[15px] leading-[24px] whitespace-pre-line">
                <span className="text-[#7a7f85]">Your message: </span>
                {data.message}
              </p>
            )}

            <div className="mt-[48px]">
              <SectionTitle>Proposals</SectionTitle>
              {detail.loading && <Loading label="Updating" />}
              {data.proposals.length === 0 ? (
                <Notice>
                  Our concierge hasn’t sent a proposal yet. You’ll find it here as soon as they do.
                </Notice>
              ) : (
                <div className="mt-[20px] grid gap-[28px]">
                  {data.proposals.map((proposal) => (
                    <ProposalCard
                      key={proposal.id}
                      proposal={proposal}
                      enquiryClosed={data.status === "closed"}
                      onChanged={detail.reload}
                      showPermalink
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AccountPage>
  );
}
