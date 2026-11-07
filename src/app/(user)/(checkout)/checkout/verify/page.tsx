import type { Metadata } from "next";

import { CheckoutFlow } from "@/features/user/checkout/components/checkout-flow";

export const metadata: Metadata = { title: "Verify your checkout" };

/** Opened from the checkout email; moves on to /checkout once the link is verified. */
export default function CheckoutVerifyPage() {
  return <CheckoutFlow />;
}
