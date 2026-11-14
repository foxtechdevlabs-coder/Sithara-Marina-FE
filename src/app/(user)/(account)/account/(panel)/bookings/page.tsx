import type { Metadata } from "next";

import { MyBookings } from "@/features/user/customer-bookings/components/my-bookings";

export const metadata: Metadata = { title: "My bookings" };

export default async function AccountBookingsPage({
  searchParams,
}: PageProps<"/account/bookings">) {
  const tab = (await searchParams).tab === "past" ? "past" : "upcoming";

  // Heading and tabs depend on the bookings (empty, cancelled…), so they render inside.
  return <MyBookings tab={tab} />;
}
