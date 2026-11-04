import { getPublicEnv } from "@/config/env";
import { clearSession, getAccessToken, refreshSession } from "./admin-session";

import { createHttpClient } from "@/services/http/create-http-client";

/**
 * HTTP client for authenticated admin endpoints. Same factory and base URL as
 * `apiClient`, plus the admin session:
 *
 * - every request carries `Authorization: Bearer <access token>`, refreshed
 *   first when it is about to expire;
 * - a 401 refreshes the session once and retries the request;
 * - if that fails too, the session is cleared ("expired"), which sends the
 *   console back to the sign-in screen.
 *
 * Use `apiClient` for the public auth endpoints (login, refresh, password
 * reset), which must not send or refresh a session.
 */
export const adminApiClient = createHttpClient({
  baseUrl: () => getPublicEnv().NEXT_PUBLIC_API_URL,
  timeoutMs: 15_000,
  getAccessToken,
  refreshAccessToken: refreshSession,
  onUnauthorized: () => clearSession("expired"),
});
