import type { Metadata } from "next";

import { CancelBooking } from "@/features/user/cancellations/components/cancel-booking";

export const metadata: Metadata = { title: "Cancel booking" };

export default async function AccountCancelBookingPage({
  params,
}: PageProps<"/account/bookings/[reference]/cancel">) {
  const { reference } = await params;
  return <CancelBooking reference={reference} />;
}
