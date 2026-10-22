import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Slot management" };

export default function AvailabilitySlotsPage() {
  return (
    <RoutePlaceholder
      title="Slot management"
      description="Bookable slot definitions. Feature module: features/admin/availability."
    />
  );
}
