import type { Metadata, Route } from "next";

import OurYachts, { type ListPagination } from "@/components/user/OurYachts";
import {
  YACHTS_PER_PAGE,
  describeFilters,
  filtersToQuery,
  hasSearchParams,
  hasUnsupportedFilters,
  parseFilters,
  parsePage,
  toListParams,
} from "@/components/user/yacht-search";
import { userRoutes } from "@/constants/routes";
import { toFleetYacht } from "@/features/user/yachts/utils/yacht-view";
import { isApiError } from "@/services/http/api-error";
import { listYachts, type YachtList } from "@/services/user/yachts.service";

export const metadata: Metadata = { title: "Our yachts" };

// The URL is the source of truth: the home search bar, /search and the
// Previous/Next links all change it, and each change fetches this page again.
export default async function YachtsPage({ searchParams }: PageProps<"/yachts">) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const page = parsePage(params);
  const query = filtersToQuery(filters);
  const summaryLink = `${userRoutes.search}${query}` as Route;

  let result: YachtList;
  try {
    result = await listYachts({ ...toListParams(filters), page, limit: YACHTS_PER_PAGE });
  } catch (error) {
    const invalid = isApiError(error) && error.status === 400;
    return (
      <OurYachts
        yachts={[]}
        failure={invalid ? "invalid-filter" : "unavailable"}
        editHref={summaryLink}
      />
    );
  }

  const totalPages = Math.max(1, Math.ceil(result.total / result.limit));
  const pageHref = (target: number) =>
    `${userRoutes.yachts}${query}${target > 1 ? `${query ? "&" : "?"}page=${target}` : ""}` as Route;
  const pagination: ListPagination | undefined =
    totalPages > 1 || result.page > 1
      ? {
          page: result.page,
          totalPages,
          previousHref: result.page > 1 ? pageHref(Math.min(result.page - 1, totalPages)) : null,
          nextHref: result.page < totalPages ? pageHref(result.page + 1) : null,
        }
      : undefined;

  const filtered = hasSearchParams(params);
  const summary =
    filtered || result.total > 0
      ? {
          shown: result.items.length,
          total: result.total,
          filtered,
          selected: describeFilters(filters, result.items[0]?.currency),
          unsupportedSelected: hasUnsupportedFilters(filters),
          editHref: summaryLink,
        }
      : undefined;

  return (
    <OurYachts
      yachts={result.items.map(toFleetYacht)}
      pagination={pagination}
      summary={summary}
    />
  );
}
