import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Customer" };

export default async function CustomerDetailPage({
  params,
}: PageProps<"/admin/customers/[customerId]">) {
  const { customerId } = await params;

  return (
    <RoutePlaceholder
      title="Customer"
      description={`A single customer. Feature module: features/admin/customers. (customerId: ${customerId})`}
    />
  );
}
