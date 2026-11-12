import type { Metadata } from "next";

import { ProfileDetails } from "@/features/user/profile/components/profile-form";

export const metadata: Metadata = { title: "Profile details" };

export default function AccountProfilePage() {
  return <ProfileDetails />;
}
