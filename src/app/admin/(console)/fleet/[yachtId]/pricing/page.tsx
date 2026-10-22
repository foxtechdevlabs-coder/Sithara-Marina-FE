import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Yacht pricing" };

export default async function FleetYachtPricingPage({
  params,
}: PageProps<"/admin/fleet/[yachtId]/pricing">) {
  const { yachtId } = await params;

  return (
    <RoutePlaceholder
      title="Yacht pricing"
      description={`Slot and add-on pricing for this yacht. Feature module: features/admin/pricing. (yachtId: ${yachtId})`}
    />
  );
}
