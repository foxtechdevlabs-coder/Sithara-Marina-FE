import { isApiError } from "@/services/http/api-error";

/** Turns Retry-After seconds into "30 seconds" / "a minute" / "5 minutes". */
function waitFor(seconds: number | undefined): string {
  if (!seconds) return "a little while";
  if (seconds < 60) return `${seconds} seconds`;
  const minutes = Math.ceil(seconds / 60);
  return minutes === 1 ? "a minute" : `${minutes} minutes`;
}

const sentence = (text: string) => {
  const t = text.trim();
  return t.charAt(0).toUpperCase() + t.slice(1) + (/[.!?]$/.test(t) ? "" : ".");
};

/**
 * A short, user-facing message for a failed admin auth request. `context`
 * picks the wording for statuses whose meaning differs per endpoint.
 */
export function authErrorMessage(error: unknown, context: "login" | "email" | "reset"): string {
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
  if (status === 429) {
    if (error.code === "RESEND_COOLDOWN")
      return `A link was sent recently. You can ask for another in ${waitFor(error.retryAfterSeconds)}.`;
    if (error.code === "TOO_MANY_EMAILS")
      return `Too many reset emails for this address. Try again in ${waitFor(error.retryAfterSeconds)}.`;
    return `Too many attempts. Please try again in ${waitFor(error.retryAfterSeconds)}.`;
  }
  if (status >= 500) return "This service is temporarily unavailable. Please try again shortly.";

  if (context === "login") {
    if (status === 401) return "That email and password don't match a team account.";
    if (status === 403) return "This account doesn't have access to the admin area.";
  }
  if (status === 400) {
    // Validation errors arrive as a list of messages.
    const messages = error.messages;
    if (messages.length) return messages.map(sentence).join(" ");
  }
  return "Something went wrong. Please try again.";
}
