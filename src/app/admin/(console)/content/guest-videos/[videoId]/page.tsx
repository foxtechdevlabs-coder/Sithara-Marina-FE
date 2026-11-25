import type { Metadata } from "next";

import { GuestVideoEditor } from "@/features/admin/content/components/guest-video-editor";

export const metadata: Metadata = { title: "Edit guest video" };

export default async function EditGuestVideoPage({
  params,
}: PageProps<"/admin/content/guest-videos/[videoId]">) {
  const { videoId } = await params;
  return <GuestVideoEditor key={videoId} videoId={videoId} />;
}
