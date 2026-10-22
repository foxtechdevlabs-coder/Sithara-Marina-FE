import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms & Conditions" };

export default function TermsPage() {
  return (
    <RoutePlaceholder
      title="Terms & Conditions"
      description="Static content page. Feature module: features/user/content."
    />
  );
}
