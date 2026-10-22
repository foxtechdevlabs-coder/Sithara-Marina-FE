import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "New office booking" };

export default function BookingNewPage() {
  return (
    <RoutePlaceholder
      title="New office booking"
      description="Manual / office-created booking. Feature module: features/admin/bookings."
    />
  );
}
