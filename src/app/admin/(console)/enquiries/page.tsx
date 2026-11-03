import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Enquiries" };

export default function EnquiriesPage() {
  return (
    <RoutePlaceholder
      title="Enquiries"
      description="Charter enquiries and proposals awaiting a reply. Feature module: features/admin/enquiries."
    />
  );
}
