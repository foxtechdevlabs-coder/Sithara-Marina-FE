"use client";

import { Spinner } from "@/components/ui/spinner";
import type { ApiQuery } from "@/hooks/use-api-query";
import { isApiError } from "@/services/http/api-error";

export interface QueryFallbackProps {
  query: Pick<ApiQuery<unknown>, "loading" | "error" | "reload">;
  /** Announced while loading, e.g. "Loading your bookings". */
  loadingLabel: string;
  /** Shown for a 404, e.g. "We couldn’t find this booking." */
  notFoundMessage?: string;
}

/** Loading and error states for an account query that has no data yet. */
export function QueryFallback({ query, loadingLabel, notFoundMessage }: QueryFallbackProps) {
  if (query.loading) {
    return (
      <div className="text-brand-600 mt-10">
        <Spinner label={loadingLabel} />
      </div>
    );
  }

  const isNotFound = isApiError(query.error) && query.error.status === 404;
  return (
    <p role="alert" className="text-body mt-10 max-w-[34rem] text-[15px] leading-relaxed">
      {isNotFound && notFoundMessage
        ? notFoundMessage
        : "We couldn’t load this just now. Please check your connection and try again."}{" "}
      {isNotFound && notFoundMessage ? null : (
        <button
          type="button"
          onClick={query.reload}
          className="text-navy-ink underline underline-offset-2"
        >
          Try again
        </button>
      )}
    </p>
  );
}
