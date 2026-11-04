"use client";

// Importing the session module registers the customer session with the
// shared HTTP client (bearer token, refresh on 401, expiry handling).
import "../session";

/** Renders nothing; mounted once in the user-area layout. */
export function AuthSessionHandlers() {
  return null;
}
