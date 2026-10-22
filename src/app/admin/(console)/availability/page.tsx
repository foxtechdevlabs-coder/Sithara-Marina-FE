import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Availability calendar" };

export default function AvailabilityCalendarPage() {
  return (
    <RoutePlaceholder
      title="Availability calendar"
      description="Fleet availability calendar. Feature module: features/admin/availability."
    />
  );
}
