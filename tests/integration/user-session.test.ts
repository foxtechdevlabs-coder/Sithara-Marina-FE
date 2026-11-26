import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Customer logout and refresh timing against a stubbed `fetch`. Paths and bodies
// follow the backend contract: POST /auth/logout takes { refresh_token } plus a
// bearer token and answers 204 with no body.
const API = "http://api.test";
const SESSION_KEY = "sithara-marina:auth-session";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
const noContent = () => new Response(null, { status: 204 });

/** A JWT-shaped token expiring `seconds` from now (negative: already expired). */
const jwt = (name: string, seconds: number) =>
  `${name}.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + seconds }))}.signature`;

const tokens = (name: string, seconds = 900) => ({
  access_token: jwt(`access-${name}`, seconds),
  refresh_token: `refresh-${name}`,
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

type Handler = () => Response | Promise<Response>;

/** Routes each path to a handler and records what was sent. */
function stubBackend(handlers: Record<string, Handler>) {
  const calls: { path: string; body: unknown; bearer: string | null }[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    const path = url.replace(API, "");
    calls.push({
      path,
      body: JSON.parse(String(init.body)),
      bearer: new Headers(init.headers).get("Authorization"),
    });
    const handler = handlers[path];
    if (!handler) throw new Error(`Unexpected request: ${path}`);
    return handler();
  });
  return calls;
}

const storage = (store: Map<string, string>) => ({
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => store.set(key, value),
  removeItem: (key: string) => store.delete(key),
});

/**
 * Fresh modules per test: the session keeps module-level state. Passing the
 * previous `store` reopens the site with the same browser storage (a restart).
 */
async function load(
  store = new Map<string, string>(),
  tabStore = new Map<string, string>(),
) {
  vi.resetModules();
  vi.stubGlobal("localStorage", storage(store));
  vi.stubGlobal("sessionStorage", storage(tabStore));
  const session = await import("@/features/user/auth/session");
  return { ...session, store, tabStore };
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", API);
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("signOut", () => {
  it("revokes a valid session with its own tokens and treats 204 as success", async () => {
    const { saveAuthSession, signOut, readAuthSession } = await load();
    const session = tokens("a");
    saveAuthSession(session);
    const calls = stubBackend({ "/auth/logout": noContent });

    await expect(signOut()).resolves.toBe(true);

    expect(calls).toEqual([
      {
        path: "/auth/logout",
        body: { refresh_token: "refresh-a" },
        bearer: `Bearer ${session.access_token}`,
      },
    ]);
    expect(readAuthSession()).toBeNull();
  });

  it("clears the session before the backend answers", async () => {
    const { saveAuthSession, signOut, readAuthSession, store } = await load();
    saveAuthSession(tokens("a"));
    const logout = deferred<Response>();
    stubBackend({ "/auth/logout": () => logout.promise });

    const signingOut = signOut();

    expect(readAuthSession()).toBeNull();
    expect(store.has(SESSION_KEY)).toBe(false);
    logout.resolve(noContent());
    await expect(signingOut).resolves.toBe(true);
  });

  it("refreshes an expired access token, then revokes the new pair", async () => {
    const { saveAuthSession, signOut, readAuthSession } = await load();
    saveAuthSession(tokens("old", -60));
    const renewed = tokens("new");
    const calls = stubBackend({
      "/auth/refresh": () => json(renewed),
      "/auth/logout": noContent,
    });

    await expect(signOut()).resolves.toBe(true);

    expect(calls).toEqual([
      { path: "/auth/refresh", body: { refresh_token: "refresh-old" }, bearer: null },
      {
        path: "/auth/logout",
        body: { refresh_token: "refresh-new" },
        bearer: `Bearer ${renewed.access_token}`,
      },
    ]);
    expect(readAuthSession()).toBeNull();
  });

  it.each([400, 401])(
    "has nothing to revoke when the refresh answers %i",
    async (status: number) => {
      const { saveAuthSession, signOut, readAuthSession } = await load();
      saveAuthSession(tokens("old", -60));
      const calls = stubBackend({
        "/auth/refresh": () =>
          json({ statusCode: status, message: "Invalid refresh token" }, status),
      });

      await expect(signOut()).resolves.toBe(true);

      expect(calls.map((call) => call.path)).toEqual(["/auth/refresh"]);
      expect(readAuthSession()).toBeNull();
    },
  );

  it("reports failure when the refresh cannot reach the backend", async () => {
    const { saveAuthSession, signOut, readAuthSession } = await load();
    saveAuthSession(tokens("old", -60));
    const calls = stubBackend({
      "/auth/refresh": () => Promise.reject(new TypeError("Failed to fetch")),
    });

    await expect(signOut()).resolves.toBe(false);

    expect(calls.map((call) => call.path)).toEqual(["/auth/refresh"]);
    expect(readAuthSession()).toBeNull();
  });

  it("reports failure when the refresh answer is not understood", async () => {
    const { saveAuthSession, signOut, readAuthSession } = await load();
    saveAuthSession(tokens("old", -60));
    stubBackend({ "/auth/refresh": () => json({ unexpected: true }) });

    await expect(signOut()).resolves.toBe(false);
    expect(readAuthSession()).toBeNull();
  });

  it.each([
    ["a server error", () => json({ statusCode: 500, message: "Boom" }, 500)],
    ["a 401", () => json({ statusCode: 401, message: "Unauthorized" }, 401)],
    ["a network failure", () => Promise.reject(new TypeError("Failed to fetch"))],
  ])("reports %s from the logout API and stays signed out", async (_name, handler: Handler) => {
    const { saveAuthSession, signOut, readAuthSession } = await load();
    saveAuthSession(tokens("a"));
    stubBackend({ "/auth/logout": handler });

    await expect(signOut()).resolves.toBe(false);
    expect(readAuthSession()).toBeNull();
  });

  it("does nothing when already signed out", async () => {
    const { signOut } = await load();
    const calls = stubBackend({});

    await expect(signOut()).resolves.toBe(true);
    expect(calls).toEqual([]);
  });
});

describe("logout during a page-load refresh", () => {
  it("shares the refresh, revokes its new token and does not restore the session", async () => {
    const { saveAuthSession, checkStoredSession, signOut, readAuthSession } = await load();
    saveAuthSession(tokens("old", -60));
    const refresh = deferred<Response>();
    const calls = stubBackend({
      "/auth/refresh": () => refresh.promise,
      "/auth/logout": noContent,
    });

    checkStoredSession();
    const signingOut = signOut();
    expect(readAuthSession()).toBeNull();

    const renewed = tokens("new");
    refresh.resolve(json(renewed));
    await expect(signingOut).resolves.toBe(true);

    expect(calls).toEqual([
      { path: "/auth/refresh", body: { refresh_token: "refresh-old" }, bearer: null },
      {
        path: "/auth/logout",
        body: { refresh_token: "refresh-new" },
        bearer: `Bearer ${renewed.access_token}`,
      },
    ]);
    expect(readAuthSession()).toBeNull();
  });

  it("stays signed out when that refresh fails", async () => {
    const { saveAuthSession, checkStoredSession, signOut, readAuthSession } = await load();
    saveAuthSession(tokens("old", -60));
    const refresh = deferred<Response>();
    const calls = stubBackend({ "/auth/refresh": () => refresh.promise });

    checkStoredSession();
    const signingOut = signOut();
    refresh.resolve(json({ statusCode: 401, message: "Invalid refresh token" }, 401));

    await expect(signingOut).resolves.toBe(true);
    expect(calls.map((call) => call.path)).toEqual(["/auth/refresh"]);
    expect(readAuthSession()).toBeNull();
  });
});

describe("signing in again while the old session is being revoked", () => {
  it("keeps the new session when the old logout fails with a 401", async () => {
    const { saveAuthSession, signOut, readAuthSession } = await load();
    saveAuthSession(tokens("old"));
    const logout = deferred<Response>();
    stubBackend({ "/auth/logout": () => logout.promise });

    const signingOut = signOut();
    saveAuthSession(tokens("new"));
    logout.resolve(json({ statusCode: 401, message: "Unauthorized" }, 401));

    await expect(signingOut).resolves.toBe(false);
    expect(readAuthSession()?.refreshToken).toBe("refresh-new");
  });

  it.each([
    ["succeeds", () => json(tokens("rotated"))],
    ["fails", () => json({ statusCode: 401, message: "Invalid refresh token" }, 401)],
  ])("keeps the new session when the old refresh %s", async (_name, answer: Handler) => {
    const { saveAuthSession, checkStoredSession, signOut, readAuthSession } = await load();
    saveAuthSession(tokens("old", -60));
    const refresh = deferred<Response>();
    stubBackend({ "/auth/refresh": () => refresh.promise, "/auth/logout": noContent });

    checkStoredSession();
    const signingOut = signOut();
    saveAuthSession(tokens("new"));
    refresh.resolve(await answer());
    await signingOut;

    expect(readAuthSession()?.refreshToken).toBe("refresh-new");
  });
});

describe("persistence", () => {
  it("keeps the session in localStorage, so reopening the site restores it", async () => {
    const first = await load();
    first.saveAuthSession(tokens("a"));
    expect(first.store.has(SESSION_KEY)).toBe(true);

    const reopened = await load(first.store); // new page load, same browser storage
    expect(reopened.readAuthSession()?.refreshToken).toBe("refresh-a");
  });

  it("forgets the session for good on sign-out", async () => {
    const first = await load();
    first.saveAuthSession(tokens("a"));
    stubBackend({ "/auth/logout": noContent });
    await first.signOut();

    const reopened = await load(first.store);
    expect(reopened.readAuthSession()).toBeNull();
  });

  it("carries over a session left in sessionStorage by the tab-scoped version", async () => {
    const legacy = JSON.stringify({ accessToken: jwt("access-a", 900), refreshToken: "refresh-a" });
    const { readAuthSession, store, tabStore } = await load(
      new Map(),
      new Map([[SESSION_KEY, legacy]]),
    );

    expect(readAuthSession()?.refreshToken).toBe("refresh-a");
    expect(store.get(SESSION_KEY)).toBe(legacy);
    expect(tabStore.has(SESSION_KEY)).toBe(false);
  });

  it("prefers the shared session over a stale tab copy", async () => {
    const shared = JSON.stringify({ accessToken: jwt("access-new", 900), refreshToken: "refresh-new" });
    const stale = JSON.stringify({ accessToken: jwt("access-old", 900), refreshToken: "refresh-old" });
    const { readAuthSession, tabStore } = await load(
      new Map([[SESSION_KEY, shared]]),
      new Map([[SESSION_KEY, stale]]),
    );

    expect(readAuthSession()?.refreshToken).toBe("refresh-new");
    expect(tabStore.has(SESSION_KEY)).toBe(false);
  });
});

describe("refreshing with several tabs open", () => {
  /** A Web Locks stand-in: the task runs once `release` is called. */
  function stubLocks() {
    const gate = deferred<void>();
    const requested: string[] = [];
    vi.stubGlobal("navigator", {
      locks: {
        request: async (name: string, task: () => Promise<unknown>) => {
          requested.push(name);
          await gate.promise;
          return task();
        },
      },
    });
    return { requested, release: () => gate.resolve() };
  }

  it("reuses the pair another tab received while this one waited for the lock", async () => {
    const { saveAuthSession, checkStoredSession, readAuthSession, store } = await load();
    saveAuthSession(tokens("old", -60));
    const locks = stubLocks();
    const calls = stubBackend({});

    checkStoredSession();
    // Meanwhile another tab spent the shared refresh token and stored the new pair.
    const renewed = tokens("other-tab");
    store.set(
      SESSION_KEY,
      JSON.stringify({ accessToken: renewed.access_token, refreshToken: renewed.refresh_token }),
    );
    locks.release();

    await vi.waitFor(() => expect(locks.requested).toEqual(["sithara-marina:auth-refresh"]));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(calls).toEqual([]); // the used token is never sent again
    expect(readAuthSession()?.refreshToken).toBe("refresh-other-tab");
  });

  it("refreshes under the lock when no other tab has", async () => {
    const { saveAuthSession, checkStoredSession, readAuthSession } = await load();
    saveAuthSession(tokens("old", -60));
    const locks = stubLocks();
    const calls = stubBackend({ "/auth/refresh": () => json(tokens("new")) });

    checkStoredSession();
    expect(calls).toEqual([]); // waits for the lock first
    locks.release();

    await vi.waitFor(() => expect(readAuthSession()?.refreshToken).toBe("refresh-new"));
    expect(calls.map((call) => call.path)).toEqual(["/auth/refresh"]);
  });
});

describe("checkStoredSession", () => {
  it("leaves a valid token alone", async () => {
    const { saveAuthSession, checkStoredSession } = await load();
    saveAuthSession(tokens("a"));
    const calls = stubBackend({});

    checkStoredSession();

    expect(calls).toEqual([]);
  });

  it("renews an expired token once, however often it is called", async () => {
    const { saveAuthSession, checkStoredSession, readAuthSession } = await load();
    saveAuthSession(tokens("old", -60));
    const refresh = deferred<Response>();
    const calls = stubBackend({ "/auth/refresh": () => refresh.promise });

    checkStoredSession();
    checkStoredSession();
    refresh.resolve(json(tokens("new")));

    await vi.waitFor(() => expect(readAuthSession()?.refreshToken).toBe("refresh-new"));
    expect(calls).toHaveLength(1);
  });

  it("clears a session whose refresh token is no longer valid", async () => {
    const { saveAuthSession, checkStoredSession, readAuthSession } = await load();
    saveAuthSession(tokens("old", -60));
    stubBackend({
      "/auth/refresh": () => json({ statusCode: 401, message: "Invalid refresh token" }, 401),
    });

    checkStoredSession();

    await vi.waitFor(() => expect(readAuthSession()).toBeNull());
  });
});
