import type { Metadata, Route } from "next";

import OurYachts, { dummyFleet } from "@/components/user/OurYachts";
import {
  filterFleet,
  filtersToQuery,
  hasSearchParams,
  parseFilters,
} from "@/components/user/yacht-search";
import { userRoutes } from "@/constants/routes";

export const metadata: Metadata = { title: "Our yachts" };

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
