"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface AdminQuery<T> {
  data: T | undefined;
  error: unknown;
  /** True until the first answer, and while reloading. */
  loading: boolean;
  /** Loads again (e.g. after a change was saved). */
  reload: () => void;
  /** Replaces the data with a fresher copy, e.g. from a mutation's response. */
  setData: (update: T | ((current: T | undefined) => T)) => void;
}

/**
 * Loads admin data in the browser (the admin session lives there). `key`
 * changes trigger a new load; an older answer never overwrites a newer one.
 */
export function useAdminQuery<T>(
  load: (signal: AbortSignal) => Promise<T>,
  key: string,
): AdminQuery<T> {
  const [data, setDataState] = useState<T>();
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (controller.signal.aborted) return;
      setLoading(true);
      setError(null);
    });
    loadRef.current(controller.signal).then(
      (result) => {
        if (controller.signal.aborted) return;
        setDataState(result);
        setLoading(false);
      },
      (err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err);
        setLoading(false);
      },
    );
    return () => controller.abort();
  }, [key, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const setData = useCallback(
    (update: T | ((current: T | undefined) => T)) =>
      setDataState((current) =>
        typeof update === "function" ? (update as (c: T | undefined) => T)(current) : update,
      ),
    [],
  );

  return { data, error, loading, reload, setData };
}
