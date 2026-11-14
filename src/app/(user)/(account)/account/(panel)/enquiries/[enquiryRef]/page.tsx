import type { Metadata } from "next";

import { EnquiryDetail } from "@/features/user/enquiries/components/enquiry-detail";

export const metadata: Metadata = { title: "Your enquiry" };

export default async function EnquiryPage({
  params,
}: PageProps<"/account/enquiries/[enquiryRef]">) {
  const { enquiryRef } = await params;

  return <EnquiryDetail reference={enquiryRef} />;
}
