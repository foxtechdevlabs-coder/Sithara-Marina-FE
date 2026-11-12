import type { Metadata } from "next";

import { EnquiryList } from "@/features/admin/enquiries/components/enquiry-list";

export const metadata: Metadata = { title: "Enquiries" };

export default function EnquiriesPage() {
  return <EnquiryList />;
}
