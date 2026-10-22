import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Yacht details" };

export default async function YachtDetailPage({ params }: PageProps<"/yachts/[yachtId]">) {
  const { yachtId } = await params;

  return (
    <RoutePlaceholder
      title="Yacht details"
      description={`Description, gallery, crew, amenities and policies. Feature module: features/user/yachts. (yachtId: ${yachtId})`}
    />
  );
}
