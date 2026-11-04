import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Admin auth against a stubbed `fetch`. Paths and bodies follow the backend
// OpenAPI contract for /admin/auth/*.
const API = "http://api.test";

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

const pair = (n: number, expiresIn = 900) => ({
  access_token: `access-${n}`,
  refresh_token: `refresh-${n}`,
  expires_in: expiresIn,
});

const profile = {
  id: "8d2b4a50-0000-4000-8000-000000000001",
  fullName: "Anjali Krishnan",
  email: "anjali@example.com",
  role: "super_admin",
  permissions: ["yachts:read"],
};

/** Fresh modules per test: the session store keeps module-level state. */
async function load() {
  vi.resetModules();
  const session = await import("@/services/admin/admin-session");
  const auth = await import("@/services/admin/auth.service");
  return { session, auth };
}

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_API_URL", API);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe("admin login", () => {
  it("posts the credentials and stores the token pair", async () => {
    const { session, auth } = await load();
    const fetchMock = vi.fn(async () => json(pair(1)));
    vi.stubGlobal("fetch", fetchMock);

    await auth.login("anjali@example.com", "secret-pass");

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${API}/admin/auth/login`);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      email: "anjali@example.com",
      password: "secret-pass",
    });
    expect(session.hasSession()).toBe(true);
    expect(await session.getAccessToken()).toBe("access-1");
  });

  it("keeps the backend error code, messages and Retry-After", async () => {
    const { auth, session } = await load();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        json(
          { statusCode: 429, code: "TOO_MANY_LOGIN_ATTEMPTS", message: "Too many attempts" },
          429,
          { "Retry-After": "120" },
        ),
      ),
    );
    const error = await auth.login("a@b.co", "x").catch((e: unknown) => e);
    expect(error).toMatchObject({ status: 429, code: "TOO_MANY_LOGIN_ATTEMPTS" });
    expect((error as { retryAfterSeconds: number }).retryAfterSeconds).toBe(120);
    expect(session.hasSession()).toBe(false);
  });
});

describe("token refresh", () => {
  it("sends only one refresh request for concurrent callers", async () => {
    const { session } = await load();
    vi.useFakeTimers({ toFake: ["Date"] });
    session.saveTokens(pair(1, 60));
    vi.setSystemTime(Date.now() + 61_000); // the access token has expired
    let resolve!: (r: Response) => void;
    const fetchMock = vi.fn(() => new Promise<Response>((r) => (resolve = r)));
    vi.stubGlobal("fetch", fetchMock);

    const calls = [session.getAccessToken(), session.getAccessToken(), session.refreshSession()];
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    resolve(json(pair(2)));
    expect(await Promise.all(calls)).toEqual(["access-2", "access-2", true]);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${API}/admin/auth/refresh`);
    expect(JSON.parse(init.body as string)).toEqual({ refresh_token: "refresh-1" });
  });

  it("refreshes after a 401 and retries the request once with the new token", async () => {
    const { session, auth } = await load();
    session.saveTokens(pair(1));
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      if (url.endsWith("/admin/auth/refresh")) return json(pair(2));
      const bearer = new Headers(init.headers).get("Authorization");
      return bearer === "Bearer access-2" ? json(profile) : json({ statusCode: 401 }, 401);
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(auth.getCurrentAdmin()).resolves.toMatchObject({ fullName: "Anjali Krishnan" });
    expect(fetchMock.mock.calls.map(([u]) => u)).toEqual([
      `${API}/admin/auth/me`,
      `${API}/admin/auth/refresh`,
      `${API}/admin/auth/me`,
    ]);
  });

  it("ends the session when the refresh token is refused", async () => {
    const { session, auth } = await load();
    session.saveTokens(pair(1));
    const ended = vi.fn();
    session.onSessionChange(ended);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json({ statusCode: 401, message: "Unauthorized" }, 401)),
    );

    await expect(auth.getCurrentAdmin()).rejects.toMatchObject({ status: 401 });
    expect(session.hasSession()).toBe(false);
    expect(ended).toHaveBeenCalledWith("expired");
  });
});

describe("admin logout", () => {
  it("revokes the refresh token with the access token, then clears the session", async () => {
    const { session, auth } = await load();
    session.saveTokens(pair(1));
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await auth.logout();

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${API}/admin/auth/logout`);
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer access-1");
    expect(JSON.parse(init.body as string)).toEqual({ refresh_token: "refresh-1" });
    expect(session.hasSession()).toBe(false);
  });

  it("clears the local session even if the server call fails", async () => {
    const { session, auth } = await load();
    session.saveTokens(pair(1));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json({ statusCode: 500 }, 500)),
    );
    await auth.logout().catch(() => {});
    expect(session.hasSession()).toBe(false);
  });
});

describe("staff password reset", () => {
  it("verifies the link, then resets with the documented fields", async () => {
    const { auth } = await load();
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async (url) =>
      url.endsWith("/verify-reset-link")
        ? json({ reset_token: "rt.secret", expires_in: 600 })
        : json({ message: "Password updated" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { reset_token } = await auth.verifyResetLink("id.secret");
    const message = await auth.resetPassword({
      resetToken: reset_token,
      newPassword: "new-password-1",
      confirmPassword: "new-password-1",
    });

    expect(message).toBe("Password updated");
    const bodies = fetchMock.mock.calls.map(([, init]) => JSON.parse(init?.body as string));
    expect(bodies).toEqual([
      { token: "id.secret" },
      {
        reset_token: "rt.secret",
        new_password: "new-password-1",
        confirm_password: "new-password-1",
      },
    ]);
  });

  it("requests a staff reset email and returns the backend message", async () => {
    const { auth } = await load();
    const fetchMock = vi.fn(async () =>
      json({ message: "If that email belongs to staff, a link is on its way." }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(auth.requestStaffPasswordReset("staff@example.com")).resolves.toMatch(/link/);
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe(
      `${API}/admin/auth/forgot-password`,
    );
  });
});
