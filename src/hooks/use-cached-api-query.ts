"use client";

import { useApiQuery, type ApiQuery } from "./use-api-query";

/** Answers older than this are not shown at all, not even while refreshing. */
const MAX_AGE_MS = 5 * 60_000;
const MAX_ENTRIES = 200;

interface Entry {
  data: unknown;
  storedAt: number;
}

const answers = new Map<string, Entry>();
const inFlight = new Map<string, Promise<unknown>>();

function remember(key: string, data: unknown) {
  answers.delete(key); // re-insert, so the oldest key is first
  answers.set(key, { data, storedAt: Date.now() });
  if (answers.size > MAX_ENTRIES) answers.delete(answers.keys().next().value as string);
}

function recent(key: string): Entry | undefined {
  const entry = answers.get(key);
  if (entry && Date.now() - entry.storedAt <= MAX_AGE_MS) return entry;
  if (entry) answers.delete(key);
  return undefined;
}

export interface CachedApiQuery<T> extends ApiQuery<T> {
  /** True while a fresh answer is being fetched behind data already shown. */
  refreshing: boolean;
}

/**
 * `useApiQuery` that shows the last answer for the same key at once (e.g. when a
 * yacht is opened again) and still asks the backend every time, replacing it with
 * the fresh answer: stale-while-revalidate. `loading` is only true when there is
 * nothing to show yet. Identical requests running at the same moment (e.g. React
 * StrictMode mounting twice in development) share one fetch.
 *
 * `key` must name everything the request depends on, and should be namespaced
 * (e.g. `calendar|<slug>|<month>`): it is shared across the page.
 */
export function useCachedApiQuery<T>(
  load: (signal: AbortSignal) => Promise<T>,
  key: string,
): CachedApiQuery<T> {
  const query = useApiQuery<T>((signal) => {
    let shared = inFlight.get(key) as Promise<T> | undefined;
    if (!shared) {
      // Not tied to one component's signal: another may be waiting on it. A result
      // nobody waits for any more is simply cached.
      shared = load(new AbortController().signal).then(
        (data) => {
          remember(key, data);
          inFlight.delete(key);
          return data;
        },
        (error: unknown) => {
          inFlight.delete(key);
          throw error;
        },
      );
      inFlight.set(key, shared);
    }
    return signal.aborted ? Promise.reject(signal.reason) : shared;
  }, key);

  const cached = recent(key);
  const data = (cached?.data as T | undefined) ?? (query.loading ? undefined : query.data);
  return {
    ...query,
    data,
    loading: query.loading && data === undefined,
    refreshing: query.loading && data !== undefined,
    // A failed refresh says so, even with older data still on screen.
    error: query.loading ? null : query.error,
  };
}
