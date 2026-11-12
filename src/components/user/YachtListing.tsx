"use client";

import type { Route } from "next";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import OurYachts, { type ListPagination, type ResultsSummary } from "@/components/user/OurYachts";
import {
  YACHTS_PER_PAGE,
  describeFilters,
  filtersToQuery,
  hasSearchParams,
  hasUnsupportedFilters,
  parseFilters,
  previewFromCatalogue,
  toListParams,
  type YachtFilters,
} from "@/components/user/yacht-search";
import { userRoutes } from "@/constants/routes";
import { toFleetYacht } from "@/features/user/yachts/utils/yacht-view";
import { isApiError } from "@/services/http/api-error";
import {
  listYachts,
  type YachtCard,
  type YachtFilterOptions,
  type YachtList,
} from "@/services/user/yachts.service";

/** Quick successive changes send one request, for the last of them. */
const CONFIRM_DELAY_MS = 200;

type Failure = "invalid-filter" | "unavailable";

interface View {
  /** The query (filters only, never `page`) these results are for. */
  query: string;
  result: YachtList | null;
  failure: Failure | null;
}

export interface YachtListingProps {
  /** The URL's filters as a query string ("" for none), without `page`. */
  initialQuery: string;
  /** The server's answer for the URL, or why there is none. */
  initialResult: YachtList | null;
  initialFailure: Failure | null;
  /**
   * Every published yacht (GET /yachts, unfiltered), when one page holds them
   * all; null otherwise. Lets a change of filters show its result at once.
   */
  catalogue: YachtCard[] | null;
  options: YachtFilterOptions | null;
}

const queryOf = (filters: YachtFilters) => filtersToQuery(filters);
const filtersOf = (query: string) => parseFilters(new URLSearchParams(query));

/**
 * Our yachts with its filters. A change shows its result immediately, worked out
 * from the complete catalogue by the backend's documented rules, while GET /yachts
 * is asked with the backend's own parameters; that answer always replaces the
 * preview. The URL follows (shareable, Back and Forward work) without reloading
 * the page from the server, and nothing locks or dims while an answer is on its
 * way. Only when no preview is possible (a date, or a catalogue too large to hold)
 * are the previous results dimmed until the answer arrives.
 */
export function YachtListing({
  initialQuery,
  initialResult,
  initialFailure,
  catalogue,
  options,
}: YachtListingProps) {
  const [view, setView] = useState<View>({
    query: initialQuery,
    result: initialResult,
    failure: initialFailure,
  });
  const [updating, setUpdating] = useState(false);
  const request = useRef<{ controller: AbortController; timer: number } | null>(null);
  const searchParams = useSearchParams();

  const show = (query: string) => {
    request.current?.controller.abort();
    if (request.current) window.clearTimeout(request.current.timer);

    const filters = filtersOf(query);
    const preview = catalogue ? previewFromCatalogue(catalogue, filters) : null;
    if (preview) {
      setView({
        query,
        failure: null,
        result: {
          items: preview.slice(0, YACHTS_PER_PAGE),
          total: preview.length,
          page: 1,
          limit: YACHTS_PER_PAGE,
        },
      });
    } else {
      setView((current) => ({ ...current, query }));
    }
    setUpdating(!preview);

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      listYachts({ ...toListParams(filters), page: 1, limit: YACHTS_PER_PAGE }, controller.signal).then(
        (result) => {
          if (controller.signal.aborted) return;
          setView({ query, result, failure: null });
          setUpdating(false);
        },
        (error: unknown) => {
          if (controller.signal.aborted) return;
          if (isApiError(error) && error.status === 400) {
            setView({ query, result: null, failure: "invalid-filter" });
          } else if (!preview) {
            setView({ query, result: null, failure: "unavailable" });
          }
          setUpdating(false);
        },
      );
    }, CONFIRM_DELAY_MS);
    request.current = { controller, timer };
  };

  const onChange = (next: YachtFilters) => {
    const query = queryOf(next);
    if (query === view.query) return;
    // A new search starts again at page 1 (the query never carries `page`).
    window.history.pushState(null, "", `${userRoutes.yachts}${query}`);
    show(query);
  };

  // Back and Forward between searches: follow the URL.
  const urlQuery = queryOf(parseFilters(searchParams));
  useEffect(() => {
    if (urlQuery === view.query) return;
    const task = window.setTimeout(() => show(urlQuery), 0);
    return () => window.clearTimeout(task);
    // `show` and `view` are read at that moment; the URL is what triggers it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQuery]);

  useEffect(
    () => () => {
      request.current?.controller.abort();
      if (request.current) window.clearTimeout(request.current.timer);
    },
    [],
  );

  const filters = filtersOf(view.query);
  const query = view.query;
  const summaryLink = `${userRoutes.search}${query}` as Route;
  const result = view.result;

  let pagination: ListPagination | undefined;
  let summary: ResultsSummary | undefined;
  if (result) {
    const totalPages = Math.max(1, Math.ceil(result.total / result.limit));
    const pageHref = (target: number) =>
      `${userRoutes.yachts}${query}${target > 1 ? `${query ? "&" : "?"}page=${target}` : ""}` as Route;
    pagination =
      totalPages > 1 || result.page > 1
        ? {
            page: result.page,
            totalPages,
            previousHref: result.page > 1 ? pageHref(Math.min(result.page - 1, totalPages)) : null,
            nextHref: result.page < totalPages ? pageHref(result.page + 1) : null,
          }
        : undefined;
    const filtered = hasSearchParams(new URLSearchParams(query));
    summary =
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
  }

  return (
    <OurYachts
      yachts={result ? result.items.map(toFleetYacht) : []}
      pagination={pagination}
      summary={summary}
      failure={view.failure ?? undefined}
      editHref={summaryLink}
      filterBar={{ filters, options, onChange, updating }}
    />
  );
}
