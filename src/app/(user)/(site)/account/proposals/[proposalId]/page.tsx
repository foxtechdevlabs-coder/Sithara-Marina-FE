import type { Metadata } from "next";

import { ProposalPage } from "@/features/user/enquiries/components/proposal-page";

export const metadata: Metadata = { title: "Proposal" };

export default async function AccountProposalPage({
  params,
}: PageProps<"/account/proposals/[proposalId]">) {
  const { proposalId } = await params;
  return <ProposalPage proposalId={proposalId} />;
}
