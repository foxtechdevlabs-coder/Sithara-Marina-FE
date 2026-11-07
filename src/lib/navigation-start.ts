const NAVIGATION_START = "sithara:navigation-start";

/** Called by the router hook in `instrumentation-client.ts`, with the destination. */
export function announceNavigationStart(url: string) {
  window.dispatchEvent(new CustomEvent<string>(NAVIGATION_START, { detail: url }));
}

/** Calls `listener` with the destination path of each navigation. Returns the unsubscribe. */
export function onNavigationStart(listener: (pathname: string) => void) {
  const handle = (event: Event) => {
    const { detail } = event as CustomEvent<string>;
    listener(new URL(detail, window.location.href).pathname);
  };
  window.addEventListener(NAVIGATION_START, handle);
  return () => window.removeEventListener(NAVIGATION_START, handle);
}
