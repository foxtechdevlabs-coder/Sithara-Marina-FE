import { isApiError } from "@/services/http/api-error";

const sentence = (text: string) => {
  const t = text.trim();
  return t.charAt(0).toUpperCase() + t.slice(1) + (/[.!?]$/.test(t) ? "" : ".");
};

/** Codes whose backend message is written for people and worth showing as is. */
const EXPLAINED: Record<string, string> = {
  NOT_PUBLISHABLE:
    "A yacht can only be visible on the website once it has operating hours, an active slot type with an active base price, and at least one photo.",
  SLUG_EXISTS: "Another yacht already uses this URL name. Choose a different one.",
  INVALID_PARTNER:
    "Choose an active partner for a partner-owned yacht (own yachts can't have a partner).",
  INVALID_PHOTO_ORDER: "The photo list changed in the meantime. Reload the page and try again.",
  STORAGE_NOT_CONFIGURED:
    "Photo storage isn't set up on the server yet, so photos can't be uploaded.",
};

/**
 * A short, user-facing message for a failed admin fleet or pricing request.
 * `notFound` names what a 404 means for this call (e.g. "This yacht").
 */
export function fleetErrorMessage(error: unknown, notFound = "This yacht"): string {
  if (!isApiError(error)) return "Something went wrong. Please try again.";

  switch (error.kind) {
    case "network":
      return "We couldn't reach the server. Check your connection and try again.";
    case "timeout":
      return "The server took too long to answer. Please try again.";
    case "parse":
    case "validation":
      return "The server sent an unexpected answer. Please try again.";
    case "aborted":
      return "The request was cancelled.";
    case "http":
      break;
  }

  const status = error.status ?? 0;
  const code = error.code;
  if (code && EXPLAINED[code]) return EXPLAINED[code];
  if (status === 401) return "Your session has ended. Please sign in again.";
  if (status === 403) return "Your account doesn't have permission to do this.";
  if (status === 404) return `${notFound} no longer exists. It may have been removed.`;
  if (status === 409 || status === 400) {
    // INVALID_SLOT_TYPES, INVALID_PRICE_RULE, INVALID_MEDIA and validation
    // errors explain the problem in `message`.
    const messages = error.messages;
    if (messages.length) return messages.map(sentence).join(" ");
  }
  if (status === 429) return "Too many requests. Please wait a moment and try again.";
  if (status >= 500) return "This service is temporarily unavailable. Please try again shortly.";
  return "Something went wrong. Please try again.";
}
