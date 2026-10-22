import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Check availability" };

export default async function YachtAvailabilityPage({
  params,
}: PageProps<"/yachts/[yachtId]/availability">) {
  const { yachtId } = await params;

  return (
    <RoutePlaceholder
      title="Check availability"
      description={`Date and slot selection (2-hour, 4-hour, half-day, full-day). Availability comes from the backend. Feature module: features/user/availability. (yachtId: ${yachtId})`}
    />
  );
}
