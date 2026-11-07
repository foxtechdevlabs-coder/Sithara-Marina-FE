import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Checkout",
  robots: {
    index: false,
    follow: false,
  },
};

export default function CheckoutPage() {
  return (
    <RoutePlaceholder
      title="Checkout"
      description="Guest details, add-ons, price review, terms and payment. Prices, the 10-minute slot hold and payment status are owned by the backend. Feature modules: features/user/checkout, features/user/payments."
    />
  );
}
