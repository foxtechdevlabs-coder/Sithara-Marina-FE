import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Customers" };

export default function CustomersPage() {
  return (
    <RoutePlaceholder
      title="Customers"
      description="Customer management. Feature module: features/admin/customers."
    />
  );
}
