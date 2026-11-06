import type { Metadata, Route } from "next";

import { JsonLd } from "@/components/seo/JsonLd";
import OurYachts, { dummyFleet } from "@/components/user/OurYachts";
import {
  filterFleet,
  filtersToQuery,
  hasSearchParams,
  parseFilters,
} from "@/components/user/yacht-search";
import { userRoutes } from "@/constants/routes";
import { generateBreadcrumbSchema, generateFleetItemListSchema } from "@/lib/seo-schema";

export const metadata: Metadata = {
  title: "Our Fleet — Luxury Yachts & Houseboats",
  description:
    "Explore the Sithara Marina yacht collection in Kerala. From the 46m Astra One superyacht to intimate cruisers and reimagined traditional houseboats.",
  alternates: {
    canonical: "/yachts",
  },
  openGraph: {
    title: "Our Fleet — Luxury Yachts & Houseboats | Sithara Marina",
    description:
      "Explore the Sithara Marina yacht collection in Kerala. From the 46m Astra One superyacht to intimate cruisers and reimagined traditional houseboats.",
    url: "/yachts",
    images: [
      {
        url: "/images/yachts/astra-one-hero.png",
        width: 1200,
        height: 630,
        alt: "The Sithara Marina Yacht Collection",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Our Fleet — Luxury Yachts & Houseboats | Sithara Marina",
    description:
      "Explore the Sithara Marina yacht collection in Kerala. From the 46m Astra One superyacht to intimate cruisers and reimagined traditional houseboats.",
    images: ["/images/yachts/astra-one-hero.png"],
  },
};

// Filters the dummy fleet by the search in the URL (from the home search bar
// or /search). Once the API is ready, fetch the filtered fleet here instead.
export default async function YachtsPage({ searchParams }: PageProps<"/yachts">) {
  const params = await searchParams;
  const filters = hasSearchParams(params) ? parseFilters(params) : null;
  const yachts = filters ? filterFleet(dummyFleet, filters) : dummyFleet;

  // Search URLs are canonical to /yachts, so the schema always lists the whole fleet.
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Our Yachts", url: "/yachts" },
  ]);
  const fleetSchema = generateFleetItemListSchema(
    dummyFleet.map((y) => ({
      id: y.id,
      name: y.name,
      description: y.description,
      image: y.image.src,
      lengthMetres: y.lengthMetres,
      guests: y.guests,
      suites: y.suites,
      area: y.area,
    })),
  );

  return (
    <>
      <JsonLd data={breadcrumbSchema} id="yachts-breadcrumb-schema" />
      <JsonLd data={fleetSchema} id="yachts-fleet-schema" />
      <OurYachts
        yachts={yachts}
        summary={
          filters
            ? {
                shown: yachts.length,
                total: dummyFleet.length,
                editHref: `${userRoutes.search}${filtersToQuery(filters)}` as Route,
              }
            : undefined
        }
      />
    </>
  );
}
