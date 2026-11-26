import type { Metadata } from "next";

import { GuestVideoEditor } from "@/features/admin/content/components/guest-video-editor";

export const metadata: Metadata = { title: "New guest video" };

export default function NewGuestVideoPage() {
  return <GuestVideoEditor />;
}
