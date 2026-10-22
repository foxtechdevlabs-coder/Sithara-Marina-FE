import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Bookings" };

export default function BookingsPage() {
  return (
    <RoutePlaceholder
      title="Bookings"
      description="Booking management. Feature module: features/admin/bookings."
    />
  );
}
