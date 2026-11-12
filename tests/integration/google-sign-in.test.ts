import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// POST /auth/google against a stubbed `fetch`. Request and response follow the
// backend Swagger contract: GoogleSignInDto { id_token } → GoogleSignInResponseDto.
const API = "http://api.test";
const SESSION_KEY = "sithara-marina:auth-session";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const SIGNED_IN = {
  access_token: "access.jwt.value",
  refresh_token: "refresh-id.secret",
  expires_in: 900,
  user: { id: "u-1", fullName: "Asha Menon", email: "asha@example.com", role: "customer" },
  is_new_user: true,
};

function stubBackend(response: () => Response) {
  const calls: { path: string; method?: string; body: unknown; bearer: string | null }[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    calls.push({
      path: url.replace(API, ""),
      method: init.method,
      body: JSON.parse(String(init.body)),
      bearer: new Headers(init.headers).get("Authorization"),
    });
    return response();
  });
  return calls;
}

async function load() {
  vi.resetModules();
  const store = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  });
  const service = await import("@/services/user/auth.service");
  const session = await import("@/features/user/auth/session");
  const errors = await import("@/services/http/backend-error");
  return { ...service, ...session, ...errors, store };
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", API);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("signInWithGoogle", () => {
  it("sends only the Google ID token, without a bearer token, and parses the session", async () => {
    const { signInWithGoogle } = await load();
    const calls = stubBackend(() => json(SIGNED_IN));

    await expect(signInWithGoogle({ id_token: "google.id.token" })).resolves.toEqual(SIGNED_IN);
    expect(calls).toEqual([
      { path: "/auth/google", method: "POST", body: { id_token: "google.id.token" }, bearer: null },
    ]);
  });

  it("stores the backend's tokens and user in the existing session store", async () => {
    const { signInWithGoogle, saveAuthSession, readAuthSession, store } = await load();
    stubBackend(() => json(SIGNED_IN));

    saveAuthSession(await signInWithGoogle({ id_token: "google.id.token" }));

    expect(readAuthSession()).toEqual({
      accessToken: SIGNED_IN.access_token,
      refreshToken: SIGNED_IN.refresh_token,
      user: SIGNED_IN.user,
    });
    // Only the session fields are kept: never the Google token or other response fields.
    expect(store.get(SESSION_KEY)).not.toContain("google.id.token");
    expect(store.get(SESSION_KEY)).not.toContain("is_new_user");
  });

  it("rejects an answer without the documented session fields", async () => {
    const { signInWithGoogle } = await load();
    stubBackend(() => json({ access_token: "only-this" }));
    await expect(signInWithGoogle({ id_token: "google.id.token" })).rejects.toMatchObject({
      kind: "validation",
    });
  });

  it.each([
    [401, "INVALID_GOOGLE_TOKEN"],
    [403, "ACCOUNT_DEACTIVATED"],
    [403, "GOOGLE_SIGN_IN_NOT_ALLOWED"],
    [409, "GOOGLE_ACCOUNT_MISMATCH"],
    [503, "GOOGLE_SIGN_IN_NOT_CONFIGURED"],
  ])("surfaces %i %s with its code", async (status, code) => {
    const { signInWithGoogle, getBackendErrorDetails } = await load();
    stubBackend(() => json({ statusCode: status, code, message: "Google sign-in failed." }, status));

    const error = await signInWithGoogle({ id_token: "google.id.token" }).catch((e: unknown) => e);
    expect(error).toMatchObject({ status });
    expect(getBackendErrorDetails(error).code).toBe(code);
  });
});
