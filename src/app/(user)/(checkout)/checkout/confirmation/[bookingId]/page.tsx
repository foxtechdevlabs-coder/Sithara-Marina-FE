import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Booking Confirmation",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function BookingConfirmationPage({
  params,
}: PageProps<"/checkout/confirmation/[bookingId]">) {
  const { bookingId } = await params;

  return (
    <RoutePlaceholder
      title="Booking confirmation"
      description={`Shown only after the backend confirms the booking. Feature module: features/user/booking. (bookingId: ${bookingId})`}
    />
  );
}
