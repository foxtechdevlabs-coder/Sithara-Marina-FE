import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Site settings" };

export default function SettingsPage() {
  return (
    <RoutePlaceholder
      title="Site settings"
      description="Site-wide settings. Feature module: features/admin/settings."
    />
  );
}
