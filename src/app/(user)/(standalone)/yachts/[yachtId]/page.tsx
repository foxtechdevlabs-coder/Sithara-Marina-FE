import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/JsonLd";
import { dummyFleet } from "@/components/user/OurYachts";
import YachtDetails, { dummyYachtDetails } from "@/components/user/YachtDetails";
import { siteConfig } from "@/config/site";
import { generateBreadcrumbSchema, generateYachtProductSchema } from "@/lib/seo-schema";

export function generateStaticParams() {
  return dummyFleet.map((yacht) => ({
    yachtId: yacht.id,
  }));
}

function getYacht(yachtId: string) {
  const yacht = dummyFleet.find((item) => item.id === yachtId);
  if (!yacht) return null;
  return {
    ...yacht,
    ratePerDay: yachtId === dummyYachtDetails.id ? dummyYachtDetails.ratePerDay : undefined,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ yachtId: string }>;
}): Promise<Metadata> {
  const { yachtId } = await params;
  const yacht = getYacht(yachtId);

  if (!yacht) {
    return {
      title: "Yacht Details",
      description: "Private luxury yacht and houseboat charters in Kerala.",
    };
  }

  const title = `${yacht.name} — Luxury Yacht Charter in ${yacht.location}`;
  const description = `${yacht.description} Private crewed charter accommodating ${yacht.guests} guests across ${yacht.suites} suites with dedicated captain and chef.`;
  const image = yacht.image.src;

  return {
    title,
    description,
    alternates: {
      canonical: `/yachts/${yacht.id}`,
    },
    openGraph: {
      title: `${title} | ${siteConfig.name}`,
      description,
      url: `/yachts/${yacht.id}`,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: `${yacht.name} private yacht charter in Kerala`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${siteConfig.name}`,
      description,
      images: [image],
    },
  };
}

export default async function YachtDetailPage({
  params,
}: {
  params: Promise<{ yachtId: string }>;
}) {
  const { yachtId } = await params;
  const yacht = getYacht(yachtId);

  const yachtName = yacht?.name ?? "Yacht Details";
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Our Yachts", url: "/yachts" },
    { name: yachtName, url: `/yachts/${yachtId}` },
  ]);

  const productSchema = generateYachtProductSchema({
    id: yachtId,
    name: yachtName,
    description: yacht?.description ?? "Luxury yacht charter in Kerala",
    image: yacht?.image.src ?? "/images/yachts/astra-one-hero.png",
    ratePerDay: yacht?.ratePerDay,
    lengthMetres: yacht?.lengthMetres,
    guests: yacht?.guests,
    suites: yacht?.suites,
  });

  return (
    <>
      <JsonLd data={breadcrumbSchema} id="yacht-breadcrumb-schema" />
      <JsonLd data={productSchema} id="yacht-product-schema" />
      <YachtDetails />
    </>
  );
}
