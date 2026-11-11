import { announceNavigationStart } from "@/lib/navigation-start";

/** Fires for links, `router.push`/`replace` and back/forward. */
export function onRouterTransitionStart(url: string) {
  announceNavigationStart(url);
}
