import type { Metadata } from "next";

import { EnquiryDetail } from "@/features/user/enquiries/components/enquiry-detail";

export const metadata: Metadata = { title: "Enquiry" };

export default async function AccountEnquiryPage({
  params,
}: PageProps<"/account/enquiries/[reference]">) {
  const { reference } = await params;
  return <EnquiryDetail reference={reference} />;
}
