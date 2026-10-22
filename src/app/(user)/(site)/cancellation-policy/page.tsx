import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Cancellation Policy" };

export default function CancellationPolicyPage() {
  return (
    <RoutePlaceholder
      title="Cancellation Policy"
      description="Static content page. Feature module: features/user/content."
    />
  );
}
