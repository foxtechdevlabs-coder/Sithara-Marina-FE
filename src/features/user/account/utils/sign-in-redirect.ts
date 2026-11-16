import type { Route } from "next";

import { userRoutes } from "@/constants/routes";
import { safeNextPath } from "@/features/user/auth/session";

/**
 * Where a signed-out visitor of an account page is sent: sign in, then back to
 * the same page with its query string (e.g. `?email=` on the email-change page).
 * Never a fragment: secrets such as `#token=` are kept out of the URL (see
 * pending-email-change.ts).
 */
export function signInRedirectFor(pathname: string, search: string): Route {
  const query = search && search !== "?" ? (search.startsWith("?") ? search : `?${search}`) : "";
  const next = safeNextPath(pathname + query) ?? safeNextPath(pathname) ?? userRoutes.account;
  return `${userRoutes.login}?next=${encodeURIComponent(next)}` as Route;
}
