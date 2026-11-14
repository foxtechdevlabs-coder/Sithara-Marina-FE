"use client";

import { Loading, Notice, textLinkClass } from "@/features/user/checkout/components/checkout-ui";
import { AccountPage } from "@/features/user/profile/components/account-ui";
import { accountErrorMessage } from "@/features/user/profile/utils/account-error-message";
import { useApiQuery } from "@/hooks/use-api-query";
import { getMyProposal } from "@/services/user/enquiries.service";

import { ProposalCard } from "./proposal-card";

/**
 * A single proposal from GET /me/proposals/{id}, for direct links. Whether its
 * enquiry is closed is not part of this response, so the backend's 409
 * PROPOSAL_NOT_OPEN decides that case if the customer tries to answer.
 */
export function ProposalPage({ proposalId }: { proposalId: string }) {
  const proposal = useApiQuery((signal) => getMyProposal(proposalId, signal), proposalId);
  const data = proposal.data;

  return (
    <AccountPage heading="Your" headingSerif="proposal.">
      {proposal.loading && !data ? (
        <Loading label="Loading your proposal" />
      ) : !data ? (
        <Notice alert>
          {accountErrorMessage(
            proposal.error,
            "We couldn’t load this proposal.",
            "We couldn’t find this proposal on your account.",
          )}{" "}
          <button type="button" className={textLinkClass} onClick={proposal.reload}>
            Try again
          </button>
        </Notice>
      ) : (
        <ProposalCard proposal={data} enquiryClosed={false} onChanged={proposal.reload} showEnquiryLink />
      )}
    </AccountPage>
  );
}
