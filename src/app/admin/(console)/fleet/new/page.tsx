import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Add yacht" };

export default function FleetNewYachtPage() {
  return (
    <RoutePlaceholder
      title="Add yacht"
      description="Create yacht form. Feature module: features/admin/fleet."
    />
  );
}
