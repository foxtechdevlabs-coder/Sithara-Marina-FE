import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "About us" };

export default function AboutPage() {
  return (
    <RoutePlaceholder
      title="About us"
      description="Static content page. Feature module: features/user/content."
    />
  );
}
