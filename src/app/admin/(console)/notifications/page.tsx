import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <RoutePlaceholder
      title="Notifications"
      description="Notification management. Feature module: features/admin/notifications."
    />
  );
}
