import type { Metadata } from "next";

import { EnquiryList } from "@/features/user/enquiries/components/enquiry-list";

export const metadata: Metadata = { title: "Your enquiries" };

export default function AccountEnquiriesPage() {
  return <EnquiryList />;
}
