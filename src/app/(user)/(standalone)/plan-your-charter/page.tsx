import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/JsonLd";
import PlanCharter from "@/components/user/PlanCharter";
import { generateBreadcrumbSchema } from "@/lib/seo-schema";

export const metadata: Metadata = {
  title: "Plan Your Charter — Bespoke Yacht Journeys",
  description:
    "Design your custom private yacht itinerary with Sithara Marina. Tell our concierge your preferred dates, guest count, and dream destinations in Kerala or Lakshadweep.",
  alternates: {
    canonical: "/plan-your-charter",
  },
  openGraph: {
    title: "Plan Your Charter — Bespoke Yacht Journeys | Sithara Marina",
    description:
      "Design your custom private yacht itinerary with Sithara Marina. Tell our concierge your preferred dates, guest count, and dream destinations in Kerala or Lakshadweep.",
    url: "/plan-your-charter",
    images: [
      {
        url: "/images/yachts/astra-one-arabian-sea.png",
        width: 1200,
        height: 630,
        alt: "Plan your private yacht charter with Sithara Marina",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Plan Your Charter — Bespoke Yacht Journeys | Sithara Marina",
    description:
      "Design your custom private yacht itinerary with Sithara Marina. Tell our concierge your preferred dates, guest count, and dream destinations in Kerala or Lakshadweep.",
    images: ["/images/yachts/astra-one-arabian-sea.png"],
  },
};

export default function PlanCharterPage() {
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Plan Your Charter", url: "/plan-your-charter" },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbSchema} id="plan-charter-breadcrumb-schema" />
      <PlanCharter />
    </>
  );
}
