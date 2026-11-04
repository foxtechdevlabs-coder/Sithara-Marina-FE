import { isApiError } from "@/services/http/api-error";
import { getBackendErrorDetails } from "@/services/http/backend-error";

import { formatWait } from "./format-wait";

/**
 * User-facing text for failures every auth form treats the same way (rate
 * limits, unavailable service, timeouts, connection problems). Returns `null`
 * for errors the form must handle itself (400 validation, 401, 409, tokens).
 */
export function commonAuthErrorMessage(error: unknown): string | null {
  if (!isApiError(error)) return "Something went wrong. Please try again.";
  const { code } = getBackendErrorDetails(error);

  if (error.status === 429) {
    const seconds = error.retryAfterSeconds;
    const wait =
      seconds !== undefined
        ? formatWait(seconds)
        : code === "TOO_MANY_EMAILS"
          ? "up to an hour"
          : "a minute";
    return code === "TOO_MANY_EMAILS"
      ? `Too many emails have been requested for this address. Please try again in ${wait}.`
      : `Please wait ${wait} before trying again.`;
  }
  if (error.status === 503 || (error.status !== undefined && error.status >= 500)) {
    return "This service is temporarily unavailable. Please try again in a few minutes.";
  }
  if (error.kind === "timeout") {
    return "Our server took too long to respond. Please try again in a moment.";
  }
  if (error.kind === "network") {
    return typeof navigator !== "undefined" && !navigator.onLine
      ? "You appear to be offline. Check your internet connection and try again."
      : "We couldn’t connect to the Sithara Marina server. Please check your connection and try again.";
  }
  if (error.kind === "validation" || error.kind === "parse") {
    return "We received an unexpected response. Please try again.";
  }
  return null;
}
