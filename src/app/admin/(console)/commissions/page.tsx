import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Commissions" };

export default function CommissionsPage() {
  return (
    <RoutePlaceholder
      title="Commissions"
      description="Partner commission management. Feature module: features/admin/commissions."
    />
  );
}
