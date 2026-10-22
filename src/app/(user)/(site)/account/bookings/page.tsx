import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "My bookings" };

export default function AccountBookingsPage() {
  return (
    <RoutePlaceholder
      title="My bookings"
      description="Customer booking history. Feature module: features/user/customer-bookings."
    />
  );
}
