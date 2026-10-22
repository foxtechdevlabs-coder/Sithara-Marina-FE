import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Booking details" };

export default async function BookingDetailPage({
  params,
}: PageProps<"/admin/bookings/[bookingId]">) {
  const { bookingId } = await params;

  return (
    <RoutePlaceholder
      title="Booking details"
      description={`A single booking. Feature module: features/admin/bookings. (bookingId: ${bookingId})`}
    />
  );
}
