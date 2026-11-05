import type { Metadata } from "next";

import { PartnerList } from "@/features/admin/partners/components/partner-list";

export const metadata: Metadata = { title: "Partners" };

export default function PartnersPage() {
  return <PartnerList />;
}
