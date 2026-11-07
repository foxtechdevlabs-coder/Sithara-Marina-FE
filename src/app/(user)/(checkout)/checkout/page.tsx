import type { Metadata } from "next";

import { CheckoutFlow } from "@/features/user/checkout/components/checkout-flow";

export const metadata: Metadata = { title: "Checkout" };

export default function CheckoutPage() {
  return <CheckoutFlow />;
}
