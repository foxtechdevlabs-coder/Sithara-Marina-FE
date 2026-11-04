import { getPublicEnv } from "@/config/env";

import { getAuthHandlers } from "./auth-handlers";
import { createHttpClient } from "./create-http-client";

/**
 * The single HTTP client for the whole application (user and admin areas).
 *
 * Service modules in `src/services/user` and `src/services/admin` call this
 * client; UI components never call `fetch` directly.
 *
 * - The base URL is `NEXT_PUBLIC_API_BASE_URL` from the root `.env`, read
 *   lazily so a missing variable fails with a clear message on first use.
 * - Authentication: requests carry the signed-in access token (unless called
 *   with `auth: false`); on a 401 the client refreshes once and retries. The
 *   session itself is owned by the area that registered `auth-handlers`.
 */
export const apiClient = createHttpClient({
  baseUrl: () => getPublicEnv().NEXT_PUBLIC_API_BASE_URL,
  timeoutMs: 15_000,
  getAccessToken: () => getAuthHandlers()?.getAccessToken() ?? null,
  refreshAccessToken: async () => (await getAuthHandlers()?.refresh()) ?? false,
  onUnauthorized: () => getAuthHandlers()?.onSessionExpired(),
});
