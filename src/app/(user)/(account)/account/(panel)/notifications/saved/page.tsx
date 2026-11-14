import type { Metadata } from "next";

import { PreferencesSaved } from "@/features/user/profile/components/profile-confirmations";

export const metadata: Metadata = { title: "Preferences saved" };

export default function PreferencesSavedPage() {
  return <PreferencesSaved />;
}
