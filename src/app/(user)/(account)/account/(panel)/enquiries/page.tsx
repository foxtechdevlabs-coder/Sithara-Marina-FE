import type { Metadata } from "next";

import { AccountHeading } from "@/features/user/account/components/account-ui";
import { BookingsTabs } from "@/features/user/customer-bookings/components/bookings-tabs";
import { MyEnquiries } from "@/features/user/enquiries/components/my-enquiries";

export const metadata: Metadata = { title: "My enquiries" };

export default function AccountEnquiriesPage() {
  return (
    <>
      <AccountHeading
        heading="Your enquiries,"
        headingSerif="personally answered."
        subtitle="Every journey you have asked us about, and the proposals prepared for you."
      />
      <BookingsTabs current="enquiries" />
      <MyEnquiries />
    </>
  );
}
