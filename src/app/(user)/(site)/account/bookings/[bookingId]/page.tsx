import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Booking details" };

export default async function AccountBookingDetailPage({
  params,
}: PageProps<"/account/bookings/[bookingId]">) {
  const { bookingId } = await params;

  return (
    <RoutePlaceholder
      title="Booking details"
      description={`A single booking. Feature module: features/user/customer-bookings. (bookingId: ${bookingId})`}
    />
  );
}
