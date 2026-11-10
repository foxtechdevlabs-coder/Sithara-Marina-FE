import type { Metadata } from "next";

import { NewCustomer } from "@/features/admin/customers/components/customer-detail";

export const metadata: Metadata = { title: "Add customer" };

export default function NewCustomerPage() {
  return <NewCustomer />;
}
