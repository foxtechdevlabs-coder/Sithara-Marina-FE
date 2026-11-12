import type { Metadata } from "next";

import { YachtListing } from "@/components/user/YachtListing";
import {
  YACHTS_PER_PAGE,
  filtersToQuery,
  parseFilters,
  parsePage,
  toListParams,
} from "@/components/user/yacht-search";
import { isApiError } from "@/services/http/api-error";
import { getYachtFilters, listYachts, type YachtCard } from "@/services/user/yachts.service";

export const metadata: Metadata = { title: "Our yachts" };

/** The backend's largest page: the catalogue is held only when it fits in one. */
const CATALOGUE_LIMIT = 100;

/**
 * Every published yacht, unfiltered, for the instant preview of a change of
 * filters. Catalogue content only, so it may be reused for a minute. Null when it
 * does not fit in one page or cannot be read: each change then waits for GET /yachts.
 */
async function loadCatalogue(): Promise<YachtCard[] | null> {
  try {
    const list = await listYachts({ limit: CATALOGUE_LIMIT }, undefined, { revalidate: 60 });
    return list.total <= list.items.length ? list.items : null;
  } catch {
    return null;
  }
}

// The URL is the source of truth for the first render (shared links, /search,
// Previous/Next): GET /yachts is asked with the backend's own parameters
// (location as `destination`). After that, YachtListing handles changes of
// filters in the browser. The three requests are independent, so they run in parallel.
export default async function YachtsPage({ searchParams }: PageProps<"/yachts">) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const page = parsePage(params);
  const query = filtersToQuery(filters);

  const [listed, catalogue, options] = await Promise.all([
    listYachts({ ...toListParams(filters), page, limit: YACHTS_PER_PAGE }).then(
      (result) => ({ result, failure: null }),
      (error: unknown) => ({
        result: null,
        failure:
          isApiError(error) && error.status === 400
            ? ("invalid-filter" as const)
            : ("unavailable" as const),
      }),
    ),
    loadCatalogue(),
    // Without options the bar still works, offering only "Any" for each choice.
    getYachtFilters().catch(() => null),
  ]);

  return (
    <YachtListing
      // A server navigation (e.g. to another page of results) starts afresh.
      key={`${query}|${page}`}
      initialQuery={query}
      initialResult={listed.result}
      initialFailure={listed.failure}
      catalogue={catalogue}
      options={options}
    />
  );
}
