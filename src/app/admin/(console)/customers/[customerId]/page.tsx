import type { Metadata } from "next";

import { CustomerDetail } from "@/features/admin/customers/components/customer-detail";

export const metadata: Metadata = { title: "Customer" };

export default async function CustomerDetailPage({
  params,
}: PageProps<"/admin/customers/[customerId]">) {
  const { customerId } = await params;
  return <CustomerDetail key={customerId} customerId={customerId} />;
}
