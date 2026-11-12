import type { Metadata } from "next";

import { NotificationsCenter } from "@/features/admin/notifications/components/notifications-center";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage({
  searchParams,
}: PageProps<"/admin/notifications">) {
  const { tab } = await searchParams;
  const initial = tab === "emails" || tab === "templates" ? tab : "alerts";
  return <NotificationsCenter key={initial} initialTab={initial} />;
}
