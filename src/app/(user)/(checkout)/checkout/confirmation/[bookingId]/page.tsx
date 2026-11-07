import type { Metadata } from "next";

import { BookingConfirmation } from "@/features/user/booking/components/booking-confirmation";

export const metadata: Metadata = { title: "Booking confirmation" };

export default async function BookingConfirmationPage({
  params,
}: PageProps<"/checkout/confirmation/[bookingId]">) {
  const { bookingId } = await params;

  return <BookingConfirmation bookingId={bookingId} />;
}
