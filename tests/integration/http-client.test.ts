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
