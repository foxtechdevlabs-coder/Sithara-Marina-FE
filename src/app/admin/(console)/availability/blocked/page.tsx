import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Blocked dates" };

export default function AvailabilityBlockedPage() {
  return (
    <RoutePlaceholder
      title="Blocked dates"
      description="Blocked dates and unavailable slots. Feature module: features/admin/availability."
    />
  );
}
