import type { Metadata } from "next";

import { PaymentLinkPage } from "@/features/user/payment-link/components/payment-link-page";

export const metadata: Metadata = {
  title: "Pay for your booking",
  robots: { index: false, follow: false },
};

/**
 * Opened from the payment link staff send for an office booking:
 * `/pay#token=…` (the backend's PAYMENT_LINK_URL). Public: the token is the access.
 */
export default function PayPage() {
  return <PaymentLinkPage />;
}
