import { getPublicEnv } from "@/config/env";

import { createHttpClient } from "./create-http-client";

/**
 * The single HTTP client for the whole application (user and admin areas).
 *
 * Service modules in `src/services/user` and `src/services/admin` call this
 * client; UI components never call `fetch` directly.
 *
 * - The base URL is read lazily so a missing variable fails with a clear
 *   message on first use rather than at import time.
 * - Authentication is not configured: the backend auth contract is not yet
 *   defined. Add `getHeaders` / `onUnauthorized` here once it is.
 */
export const apiClient = createHttpClient({
  baseUrl: () => getPublicEnv().NEXT_PUBLIC_API_BASE_URL,
  timeoutMs: 15_000,
});
