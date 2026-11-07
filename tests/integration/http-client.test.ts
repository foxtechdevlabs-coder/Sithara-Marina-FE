import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { ApiError } from "@/services/http/api-error";
import { createHttpClient } from "@/services/http/create-http-client";

// The tests below exercise the real HttpClient against a stubbed global
// `fetch`. No endpoint used here represents a real backend contract.
const BASE = "http://api.test/api";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function stubFetch(impl: (url: string, init: RequestInit) => Promise<Response>) {
  const mock = vi.fn(impl);
  vi.stubGlobal("fetch", mock);
  return mock;
}

async function catchApiError(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error("Expected the request to fail");
}

afterEach(() => {
  vi.useRealTimers();
});

describe("createHttpClient — successful requests", () => {
  it("sends GET with query string and default Accept header, and parses JSON", async () => {
    const fetchMock = stubFetch(async () => jsonResponse({ ok: true }));
    const client = createHttpClient({ baseUrl: BASE });

    await expect(client.get("/items", { query: { page: 1 } })).resolves.toEqual({ ok: true });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("http://api.test/api/items?page=1");
    expect(init.method).toBe("GET");
    expect(new Headers(init.headers).get("Accept")).toBe("application/json");
  });

  it("serialises object bodies as JSON", async () => {
    const fetchMock = stubFetch(async () => jsonResponse({}, 201));
    const client = createHttpClient({ baseUrl: BASE });

    await client.post("/items", { body: { name: "A" } });

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.body).toBe('{"name":"A"}');
    expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
  });

  it("passes FormData through untouched without forcing a JSON content type", async () => {
    const fetchMock = stubFetch(async () => jsonResponse({}));
    const client = createHttpClient({ baseUrl: BASE });
    const form = new FormData();
    form.set("file", "x");

    await client.post("/upload", { body: form });

    const [, init] = fetchMock.mock.calls[0]!;
    expect(init.body).toBe(form);
    expect(new Headers(init.headers).has("Content-Type")).toBe(false);
  });

  it("merges getHeaders() with per-request headers (request wins)", async () => {
    const fetchMock = stubFetch(async () => jsonResponse({}));
    const client = createHttpClient({
      baseUrl: BASE,
      getHeaders: async () => ({ "X-Client": "default", "X-Trace": "1" }),
    });

    await client.get("/items", { headers: { "X-Client": "override" } });

    const headers = new Headers(fetchMock.mock.calls[0]![1].headers);
    expect(headers.get("X-Client")).toBe("override");
    expect(headers.get("X-Trace")).toBe("1");
  });

  it("resolves the base URL lazily when given a function", async () => {
    const fetchMock = stubFetch(async () => jsonResponse({}));
    let base = "http://first.test";
    const client = createHttpClient({ baseUrl: () => base });
    base = "http://second.test";

    await client.get("/items");

    expect(fetchMock.mock.calls[0]![0]).toBe("http://second.test/items");
  });

  it("returns undefined for an empty 204 response", async () => {
    stubFetch(async () => new Response(null, { status: 204 }));
    const client = createHttpClient({ baseUrl: BASE });

    await expect(client.delete("/items/1")).resolves.toBeUndefined();
  });

  it("does not attach a signal when no timeout or signal is used (keeps Next.js memoization)", async () => {
    const fetchMock = stubFetch(async () => jsonResponse({}));
    const client = createHttpClient({ baseUrl: BASE });

    await client.get("/items");

    expect(fetchMock.mock.calls[0]![1].signal).toBeUndefined();
  });
});

describe("createHttpClient — response validation", () => {
  const schema = z.object({ id: z.string() });

  it("returns schema-parsed data", async () => {
    stubFetch(async () => jsonResponse({ id: "1", extra: true }));
    const client = createHttpClient({ baseUrl: BASE });

    await expect(client.get("/items/1", { schema })).resolves.toEqual({ id: "1" });
  });

  it("throws a validation ApiError when the shape is wrong", async () => {
    stubFetch(async () => jsonResponse({ id: 1 }));
    const client = createHttpClient({ baseUrl: BASE });

    const error = await catchApiError(client.get("/items/1", { schema }));
    expect(error.kind).toBe("validation");
    expect(error.status).toBe(200);
  });

  it("throws a parse ApiError for invalid JSON in a 2xx response", async () => {
    stubFetch(async () => new Response("<html>", { status: 200 }));
    const client = createHttpClient({ baseUrl: BASE });

    const error = await catchApiError(client.get("/items"));
    expect(error.kind).toBe("parse");
  });
});

describe("createHttpClient — failures", () => {
  it("throws an http ApiError with status and parsed body for non-2xx responses", async () => {
    stubFetch(async () => jsonResponse({ reason: "taken" }, 409));
    const client = createHttpClient({ baseUrl: BASE });

    const error = await catchApiError(client.post("/items"));
    expect(error.kind).toBe("http");
    expect(error.status).toBe(409);
    expect(error.body).toEqual({ reason: "taken" });
  });

  it("keeps a non-JSON error body as text", async () => {
    stubFetch(async () => new Response("Bad gateway", { status: 502 }));
    const client = createHttpClient({ baseUrl: BASE });

    const error = await catchApiError(client.get("/items"));
    expect(error.status).toBe(502);
    expect(error.body).toBe("Bad gateway");
  });

  it("calls onUnauthorized once on 401 (expired session) and still throws", async () => {
    stubFetch(async () => jsonResponse({}, 401));
    const onUnauthorized = vi.fn();
    const client = createHttpClient({ baseUrl: BASE, onUnauthorized });

    const error = await catchApiError(client.get("/me"));
    expect(error.isUnauthorized).toBe(true);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).toHaveBeenCalledWith(error);
  });

  it("does not call onUnauthorized for 403", async () => {
    stubFetch(async () => jsonResponse({}, 403));
    const onUnauthorized = vi.fn();
    const client = createHttpClient({ baseUrl: BASE, onUnauthorized });

    const error = await catchApiError(client.get("/admin-only"));
    expect(error.isForbidden).toBe(true);
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("throws a network ApiError when fetch rejects", async () => {
    stubFetch(async () => {
      throw new TypeError("fetch failed");
    });
    const client = createHttpClient({ baseUrl: BASE });

    const error = await catchApiError(client.get("/items"));
    expect(error.kind).toBe("network");
    expect(error.status).toBeUndefined();
    expect(error.cause).toBeInstanceOf(TypeError);
  });
});

/** A fetch stub that, like real fetch, never resolves until its signal aborts. */
function hangingFetch() {
  return stubFetch(
    (_url, init) =>
      new Promise<Response>((_resolve, reject) => {
        const abort = () => reject(new DOMException("The operation was aborted.", "AbortError"));
        if (init.signal?.aborted) abort();
        else init.signal?.addEventListener("abort", abort);
      }),
  );
}

describe("createHttpClient — timeouts and cancellation", () => {
  it("throws a timeout ApiError after the client default timeout", async () => {
    vi.useFakeTimers();
    hangingFetch();
    const client = createHttpClient({ baseUrl: BASE, timeoutMs: 1000 });

    const pending = catchApiError(client.get("/slow"));
    await vi.advanceTimersByTimeAsync(1000);

    const error = await pending;
    expect(error.kind).toBe("timeout");
  });

  it("lets a request override the default timeout", async () => {
    vi.useFakeTimers();
    hangingFetch();
    const client = createHttpClient({ baseUrl: BASE, timeoutMs: 60_000 });

    const pending = catchApiError(client.get("/slow", { timeoutMs: 50 }));
    await vi.advanceTimersByTimeAsync(50);

    expect((await pending).kind).toBe("timeout");
  });

  it("can disable the timeout per request", async () => {
    const fetchMock = stubFetch(async () => jsonResponse({}));
    const client = createHttpClient({ baseUrl: BASE, timeoutMs: 1000 });

    await client.get("/items", { timeoutMs: false });

    expect(fetchMock.mock.calls[0]![1].signal).toBeUndefined();
  });

  it("throws an aborted ApiError when the caller cancels", async () => {
    hangingFetch();
    const client = createHttpClient({ baseUrl: BASE, timeoutMs: 60_000 });
    const controller = new AbortController();

    const pending = catchApiError(client.get("/slow", { signal: controller.signal }));
    controller.abort();

    expect((await pending).kind).toBe("aborted");
  });

  it("fails immediately for an already-aborted signal", async () => {
    hangingFetch();
    const client = createHttpClient({ baseUrl: BASE, timeoutMs: 60_000 });

    const error = await catchApiError(client.get("/slow", { signal: AbortSignal.abort() }));
    expect(error.kind).toBe("aborted");
  });
});

describe("createHttpClient — authentication and refresh", () => {
  const bearer = (init: RequestInit) => new Headers(init.headers).get("Authorization");

  /** Answers 401 unless the request carries `Bearer <validToken>`. */
  function protectedFetch(validToken: () => string) {
    return stubFetch(async (_url, init) =>
      bearer(init) === `Bearer ${validToken()}`
        ? jsonResponse({ ok: true })
        : jsonResponse({}, 401),
    );
  }

  it("sends the access token, and omits it for auth: false requests", async () => {
    const fetchMock = stubFetch(async () => jsonResponse({}));
    const client = createHttpClient({ baseUrl: BASE, getAccessToken: () => "token-1" });

    await client.get("/me");
    await client.post("/auth/login", { auth: false });

    expect(bearer(fetchMock.mock.calls[0]![1])).toBe("Bearer token-1");
    expect(bearer(fetchMock.mock.calls[1]![1])).toBeNull();
  });

  it("refreshes once on 401 and retries with the new token", async () => {
    let token = "expired";
    const fetchMock = protectedFetch(() => "fresh");
    const refreshAccessToken = vi.fn(async () => {
      token = "fresh";
      return true;
    });
    const onUnauthorized = vi.fn();
    const client = createHttpClient({
      baseUrl: BASE,
      getAccessToken: () => token,
      refreshAccessToken,
      onUnauthorized,
    });

    await expect(client.get("/me")).resolves.toEqual({ ok: true });
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(bearer(fetchMock.mock.calls[1]![1])).toBe("Bearer fresh");
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("shares one refresh between concurrent 401s", async () => {
    let token = "expired";
    protectedFetch(() => "fresh");
    let finishRefresh!: () => void;
    const refreshAccessToken = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          finishRefresh = () => {
            token = "fresh";
            resolve(true);
          };
        }),
    );
    const client = createHttpClient({
      baseUrl: BASE,
      getAccessToken: () => token,
      refreshAccessToken,
    });

    const requests = [client.get("/a"), client.get("/b"), client.get("/c")];
    await vi.waitFor(() => expect(refreshAccessToken).toHaveBeenCalled());
    finishRefresh();

    await expect(Promise.all(requests)).resolves.toHaveLength(3);
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
  });

  it("holds new requests until a running refresh finishes", async () => {
    let token = "expired";
    const fetchMock = protectedFetch(() => "fresh");
    let finishRefresh!: () => void;
    const refreshAccessToken = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          finishRefresh = () => {
            token = "fresh";
            resolve(true);
          };
        }),
    );
    const client = createHttpClient({
      baseUrl: BASE,
      getAccessToken: () => token,
      refreshAccessToken,
    });

    const first = client.get("/a");
    await vi.waitFor(() => expect(refreshAccessToken).toHaveBeenCalled());
    const queued = client.get("/b"); // started while refreshing
    finishRefresh();
    await Promise.all([first, queued]);

    const queuedCalls = fetchMock.mock.calls.filter(([url]) => url.endsWith("/b"));
    expect(queuedCalls).toHaveLength(1); // sent once, with the new token
    expect(bearer(queuedCalls[0]![1])).toBe("Bearer fresh");
  });

  it("calls onUnauthorized and does not retry when refresh fails", async () => {
    const fetchMock = stubFetch(async () => jsonResponse({}, 401));
    const refreshAccessToken = vi.fn(async () => false);
    const onUnauthorized = vi.fn();
    const client = createHttpClient({
      baseUrl: BASE,
      getAccessToken: () => "expired",
      refreshAccessToken,
      onUnauthorized,
    });

    const error = await catchApiError(client.get("/me"));
    expect(error.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("retries only once even if the retry is also rejected (no loop)", async () => {
    let token = "a";
    const fetchMock = stubFetch(async () => jsonResponse({}, 401));
    const refreshAccessToken = vi.fn(async () => {
      token = `${token}+`;
      return true;
    });
    const onUnauthorized = vi.fn();
    const client = createHttpClient({
      baseUrl: BASE,
      getAccessToken: () => token,
      refreshAccessToken,
      onUnauthorized,
    });

    await catchApiError(client.get("/me"));
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("never treats a 401 from an auth: false request as an expired session", async () => {
    stubFetch(async () => jsonResponse({ message: "Invalid email or password" }, 401));
    const refreshAccessToken = vi.fn(async () => true);
    const onUnauthorized = vi.fn();
    const client = createHttpClient({
      baseUrl: BASE,
      getAccessToken: () => "token",
      refreshAccessToken,
      onUnauthorized,
    });

    const error = await catchApiError(client.post("/auth/login", { auth: false }));
    expect(error.status).toBe(401);
    expect(refreshAccessToken).not.toHaveBeenCalled();
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it.each(["soon", "-5", "12.5", "12 seconds", "Wed, 21 Oct 2026 07:28:00 GMT", ""])(
    "ignores the invalid Retry-After %j",
    async (value: string) => {
      stubFetch(async () => new Response("{}", { status: 429, headers: { "Retry-After": value } }));
      const client = createHttpClient({ baseUrl: BASE });

      const error = await catchApiError(client.post("/auth/login", { auth: false }));
      expect(error.retryAfterSeconds).toBeUndefined();
    },
  );

  it("exposes Retry-After from 429 responses", async () => {
    stubFetch(
      async () =>
        new Response(JSON.stringify({ code: "RESEND_COOLDOWN" }), {
          status: 429,
          headers: { "Retry-After": "59" },
        }),
    );
    const client = createHttpClient({ baseUrl: BASE });

    const error = await catchApiError(client.post("/auth/forgot-password", { auth: false }));
    expect(error.retryAfterSeconds).toBe(59);
  });
});
