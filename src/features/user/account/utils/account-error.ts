import { formatWait } from "@/features/user/auth/utils/format-wait";
import { isApiError } from "@/services/http/api-error";

/**
 * A customer-facing message for a failed account request: a documented error
 * `code` from `byCode`, then connection problems and rate limits, then the
 * fallback. A 401 never gets here as a message: the API client refreshes the
 * session once and otherwise sends the customer to sign in again.
 */
export function accountErrorMessage(
  error: unknown,
  fallback: string,
  byCode: Partial<Record<string, string>> = {},
): string {
  if (!isApiError(error)) return fallback;
  const byKnownCode = error.code ? byCode[error.code] : undefined;
  if (byKnownCode) return byKnownCode;
  if (error.kind === "network" || error.kind === "timeout") {
    return "We couldn’t reach Sithara Marina just now. Please check your connection and try again.";
  }
  if (error.status === 429) {
    const wait = error.retryAfterSeconds;
    return wait
      ? `Too many attempts. Please try again in ${formatWait(wait)}.`
      : "Too many attempts. Please wait a moment and try again.";
  }
  if (error.status === 403) return "This page is only available to customer accounts.";
  return fallback;
}
