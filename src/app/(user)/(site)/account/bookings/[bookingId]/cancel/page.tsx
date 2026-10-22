import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Request cancellation" };

export default async function AccountBookingCancelPage({
  params,
}: PageProps<"/account/bookings/[bookingId]/cancel">) {
  const { bookingId } = await params;

  return (
    <RoutePlaceholder
      title="Request cancellation"
      description={`Cancellation request for a booking. Feature module: features/user/cancellations. (bookingId: ${bookingId})`}
    />
  );
}
