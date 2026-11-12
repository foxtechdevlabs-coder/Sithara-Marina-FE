import type { Metadata } from "next";

import { EnquiryDetail } from "@/features/admin/enquiries/components/enquiry-detail";

export const metadata: Metadata = { title: "Enquiry" };

export default async function EnquiryPage({
  params,
  searchParams,
}: PageProps<"/admin/enquiries/[enquiryId]">) {
  const { enquiryId } = await params;
  const q = await searchParams;
  const tab = q.tab === "proposal" || q.tab === "history" ? q.tab : "enquiry";
  return (
    <EnquiryDetail
      key={enquiryId}
      enquiryId={enquiryId}
      initialTab={tab}
      notice={typeof q.notice === "string" ? q.notice : undefined}
    />
  );
}
