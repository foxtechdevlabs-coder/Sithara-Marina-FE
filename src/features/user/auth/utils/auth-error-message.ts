import { isApiError } from "@/services/http/api-error";
import { getBackendErrorDetails } from "@/services/http/backend-error";

import { formatWait } from "./format-wait";

const EMAIL_COOLDOWN_MESSAGE = "Please wait a moment before requesting another email.";
const HOURLY_LIMIT_MESSAGES = {
  signup:
    "You have exceeded the hourly limit for verification emails. Please check your spam folder or try again in a bit.",
  reset:
    "You have exceeded the hourly limit for password reset emails. Please check your spam folder or try again in a bit.",
} as const;

/**
 * Text for a 429 from an endpoint that sends email, or `null` for anything else.
 * The backend limits each purpose separately, so each flow names its own.
 */
export function emailRateLimitMessage(
  error: unknown,
  purpose: keyof typeof HOURLY_LIMIT_MESSAGES,
): string | null {
  if (!isApiError(error) || error.status !== 429) return null;
  return getBackendErrorDetails(error).code === "TOO_MANY_EMAILS"
    ? HOURLY_LIMIT_MESSAGES[purpose]
    : EMAIL_COOLDOWN_MESSAGE;
}

/**
 * User-facing text for failures every auth form treats the same way (rate
 * limits, unavailable service, timeouts, connection problems). Returns `null`
 * for errors the form must handle itself (400 validation, 401, 409, tokens).
 */
export function commonAuthErrorMessage(error: unknown): string | null {
  if (!isApiError(error)) return "Something went wrong. Please try again.";

  if (error.status === 429) {
    const seconds = error.retryAfterSeconds;
    return `Please wait ${seconds !== undefined ? formatWait(seconds) : "a minute"} before trying again.`;
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
