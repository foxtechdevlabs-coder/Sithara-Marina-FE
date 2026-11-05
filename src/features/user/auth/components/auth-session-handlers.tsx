"use client";

import { useEffect } from "react";

// Importing the session module registers the customer session with the
// shared HTTP client (bearer token, refresh on 401, expiry handling).
import { checkStoredSession } from "../session";

/** Renders nothing; mounted once in the user-area layout. */
export function AuthSessionHandlers() {
  useEffect(() => {
    checkStoredSession();
  }, []);

  return null;
}
