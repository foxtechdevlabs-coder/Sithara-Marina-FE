import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Content" };

export default function ContentPage() {
  return (
    <RoutePlaceholder
      title="Content"
      description="Website content management. Feature module: features/admin/content."
    />
  );
}
