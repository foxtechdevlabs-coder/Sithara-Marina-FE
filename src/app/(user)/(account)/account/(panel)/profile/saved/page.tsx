import type { Metadata } from "next";

import { ProfileSaved } from "@/features/user/profile/components/profile-confirmations";

export const metadata: Metadata = { title: "Profile updated" };

export default function ProfileSavedPage() {
  return <ProfileSaved />;
}
