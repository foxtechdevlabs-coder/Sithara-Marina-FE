import type { Metadata } from "next";

import { ProposalPreview } from "@/features/admin/enquiries/components/proposal-preview";

export const metadata: Metadata = { title: "Proposal preview" };

export default async function ProposalPreviewPage({
  params,
  searchParams,
}: PageProps<"/admin/enquiries/[enquiryId]/proposal">) {
  const { enquiryId } = await params;
  const q = await searchParams;
  return (
    <ProposalPreview
      enquiryId={enquiryId}
      proposalId={typeof q.id === "string" ? q.id : undefined}
    />
  );
}
