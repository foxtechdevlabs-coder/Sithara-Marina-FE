import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Contact us" };

export default function ContactPage() {
  return (
    <RoutePlaceholder
      title="Contact us"
      description="Static content page. Feature module: features/user/content."
    />
  );
}
