import type { Metadata, Route } from "next";

import OurYachts from "@/components/user/OurYachts";

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
  if (!hasSearchParams(params)) return <OurYachts />;

  const filters = parseFilters(params);
  const yachts = filterFleet(dummyFleet, filters);
  return (
    <OurYachts
      yachts={yachts}
      summary={{
        shown: yachts.length,
        total: dummyFleet.length,
        editHref: `${userRoutes.search}${filtersToQuery(filters)}` as Route,
      }}
    />
  );
}
