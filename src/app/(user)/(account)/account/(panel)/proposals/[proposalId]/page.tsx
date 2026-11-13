import type { Metadata } from "next";

import { ProposalDetail } from "@/features/user/enquiries/components/proposal-detail";

export const metadata: Metadata = { title: "Your proposal" };

export default async function ProposalPage({
  params,
}: PageProps<"/account/proposals/[proposalId]">) {
  const { proposalId } = await params;

  return <ProposalDetail proposalId={proposalId} />;
}
