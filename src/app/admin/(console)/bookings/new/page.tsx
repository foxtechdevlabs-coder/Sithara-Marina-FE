import type { Metadata } from "next";

import { OfficeBookingForm } from "@/features/admin/bookings/components/office-booking-form";

export const metadata: Metadata = { title: "New office booking" };

export default function BookingNewPage() {
  return <OfficeBookingForm />;
}
