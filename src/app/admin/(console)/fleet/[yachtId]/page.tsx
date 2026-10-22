import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Yacht" };

export default async function FleetYachtPage({ params }: PageProps<"/admin/fleet/[yachtId]">) {
  const { yachtId } = await params;

  return (
    <RoutePlaceholder
      title="Yacht"
      description={`Yacht overview. Feature module: features/admin/fleet. (yachtId: ${yachtId})`}
    />
  );
}
