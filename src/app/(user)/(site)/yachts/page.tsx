import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Our yachts" };

export default function YachtsPage() {
  return (
    <RoutePlaceholder
      title="Our yachts"
      description="Yacht listing, search and filters. Feature module: features/user/yachts."
    />
  );
}
