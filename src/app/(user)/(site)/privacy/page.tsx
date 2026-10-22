import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <RoutePlaceholder
      title="Privacy Policy"
      description="Static content page. Feature module: features/user/content."
    />
  );
}
