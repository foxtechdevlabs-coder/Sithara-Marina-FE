"use client";

import { useEffect, useSyncExternalStore } from "react";

/*
 * The yacht shown on the current fleet page, so the console header can say
 * "Operations / Yachts / Astra One" once the page has loaded it.
 */

type Crumb = { id: string; name: string } | null;
let current: Crumb = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function publish(crumb: Crumb) {
  current = crumb;
  listeners.forEach((l) => l());
}

/** The loaded yacht's id and name, or null. */
export function useBreadcrumbYacht(): Crumb {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
}

/** Call from a fleet page once its yacht has loaded. */
export function usePublishBreadcrumbYacht(yacht: { id: string; name: string } | undefined) {
  const id = yacht?.id;
  const name = yacht?.name;
  useEffect(() => {
    if (!id || !name) return;
    publish({ id, name });
    return () => publish(null);
  }, [id, name]);
}
