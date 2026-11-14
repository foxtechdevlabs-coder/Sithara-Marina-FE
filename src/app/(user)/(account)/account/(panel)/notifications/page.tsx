import type { Metadata } from "next";

import { NotificationSettings } from "@/features/user/profile/components/notification-preferences";

export const metadata: Metadata = { title: "Notifications" };

export default function AccountNotificationsPage() {
  return <NotificationSettings />;
}
