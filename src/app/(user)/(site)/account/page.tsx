import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "My profile" };

export default function AccountProfilePage() {
  return (
    <RoutePlaceholder
      title="My profile"
      description="Customer account details. Feature module: features/user/profile."
    />
  );
}
