import type { Metadata } from "next";

import { PartnerEditor } from "@/features/admin/partners/components/partner-editor";

export const metadata: Metadata = { title: "Partner" };

// `?notice=created` shows the confirmation after adding a partner.
export default async function PartnerDetailPage({
  params,
  searchParams,
}: PageProps<"/admin/partners/[partnerId]">) {
  const { partnerId } = await params;
  const { notice } = await searchParams;
  return <PartnerEditor key={partnerId} partnerId={partnerId} created={notice === "created"} />;
}
