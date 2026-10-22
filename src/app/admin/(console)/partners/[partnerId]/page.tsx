import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Partner" };

export default async function PartnerDetailPage({
  params,
}: PageProps<"/admin/partners/[partnerId]">) {
  const { partnerId } = await params;

  return (
    <RoutePlaceholder
      title="Partner"
      description={`A single partner. Feature module: features/admin/partners. (partnerId: ${partnerId})`}
    />
  );
}
