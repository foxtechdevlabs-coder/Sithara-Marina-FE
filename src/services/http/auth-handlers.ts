/**
 * Bridge between the shared HTTP client and whichever area owns the signed-in
 * session. The customer area registers its handlers
 * (src/features/user/auth/session.ts); shared code never imports an area.
 * Until something registers, requests are sent without authentication.
 */
export interface AuthHandlers {
  /** Current access token, or `null` when signed out. */
  getAccessToken: () => string | null;
  /** Renews the session; resolves `true` on success. Must not throw. */
  refresh: () => Promise<boolean>;
  /** A 401 could not be recovered: clear the session (and send the user to sign in). */
  onSessionExpired: () => void;
}

let handlers: AuthHandlers | null = null;

export function registerAuthHandlers(next: AuthHandlers): void {
  handlers = next;
}

export function getAuthHandlers(): AuthHandlers | null {
  return handlers;
}
