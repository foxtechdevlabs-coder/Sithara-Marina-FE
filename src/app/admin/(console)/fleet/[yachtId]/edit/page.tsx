import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Edit yacht" };

export default async function FleetYachtEditPage({
  params,
}: PageProps<"/admin/fleet/[yachtId]/edit">) {
  const { yachtId } = await params;

  return (
    <RoutePlaceholder
      title="Edit yacht"
      description={`Edit yacht form. Feature module: features/admin/fleet. (yachtId: ${yachtId})`}
    />
  );
}
