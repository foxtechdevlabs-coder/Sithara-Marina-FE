import { ApiError } from "./api-error";
import { buildUrl } from "./build-url";
import type { HttpMethod, RequestOptions } from "./types";

export interface HttpClientOptions {
  /** Absolute base URL of the backend API, or a function returning it. */
  baseUrl: string | (() => string);
  /** Default timeout in milliseconds for every request. Omit for no timeout. */
  timeoutMs?: number;
  /**
   * Called before every request to supply extra headers (for example an
   * authorization header once the auth contract is defined).
   */
  getHeaders?: () => HeadersInit | Promise<HeadersInit>;
  /**
   * Called when the backend answers 401, before the error is thrown. The
   * single place to react to an expired session (e.g. redirect to sign-in).
   */
  onUnauthorized?: (error: ApiError) => void | Promise<void>;
}

type MethodCall = <TResponse = unknown>(
  path: string,
  options?: RequestOptions<TResponse>,
) => Promise<TResponse>;

export interface HttpClient {
  request: <TResponse = unknown>(
    method: HttpMethod,
    path: string,
    options?: RequestOptions<TResponse>,
  ) => Promise<TResponse>;
  get: MethodCall;
  post: MethodCall;
  put: MethodCall;
  patch: MethodCall;
  delete: MethodCall;
}

function isBodyInit(body: unknown): body is BodyInit {
  return (
    typeof body === "string" ||
    body instanceof FormData ||
    body instanceof URLSearchParams ||
    body instanceof Blob ||
    body instanceof ArrayBuffer
  );
}

/**
 * Combines the caller's signal with an optional timeout. Returns `undefined`
 * when neither is needed so Next.js request memoization stays enabled.
 */
function createRequestSignal(signal: AbortSignal | undefined, timeoutMs: number | undefined) {
  if (!timeoutMs) return { signal, timedOut: () => false, dispose: () => {} };

  const controller = new AbortController();
  let didTimeOut = false;
  const timer = setTimeout(() => {
    didTimeOut = true;
    controller.abort();
  }, timeoutMs);

  const forwardAbort = () => controller.abort(signal?.reason);
  if (signal?.aborted) forwardAbort();
  else signal?.addEventListener("abort", forwardAbort, { once: true });

  return {
    signal: controller.signal,
    timedOut: () => didTimeOut,
    dispose: () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", forwardAbort);
    },
  };
}

/**
 * Creates a small, typed wrapper around the platform `fetch`.
 *
 * Native `fetch` is used (rather than a client library) so that Next.js
 * request caching and revalidation keep working in Server Components.
 */
export function createHttpClient({
  baseUrl,
  timeoutMs: defaultTimeoutMs,
  getHeaders,
  onUnauthorized,
}: HttpClientOptions): HttpClient {
  async function request<TResponse = unknown>(
    method: HttpMethod,
    path: string,
    options: RequestOptions<TResponse> = {},
  ): Promise<TResponse> {
    const { query, body, headers, signal, schema, init } = options;
    const timeoutMs =
      options.timeoutMs === false ? undefined : (options.timeoutMs ?? defaultTimeoutMs);
    const label = `${method} ${path}`;

    const finalHeaders = new Headers(getHeaders ? await getHeaders() : undefined);
    new Headers(headers).forEach((value, key) => finalHeaders.set(key, value));
    if (!finalHeaders.has("Accept")) finalHeaders.set("Accept", "application/json");

    let requestBody: BodyInit | undefined;
    if (body !== undefined) {
      if (isBodyInit(body)) {
        requestBody = body;
      } else {
        requestBody = JSON.stringify(body);
        if (!finalHeaders.has("Content-Type")) {
          finalHeaders.set("Content-Type", "application/json");
        }
      }
    }

    const url = buildUrl(typeof baseUrl === "function" ? baseUrl() : baseUrl, path, query);
    const requestSignal = createRequestSignal(signal, timeoutMs);

    let response: Response;
    let text: string;
    try {
      response = await fetch(url, {
        ...init,
        method,
        headers: finalHeaders,
        body: requestBody,
        signal: requestSignal.signal,
      });
      text = await response.text();
    } catch (cause) {
      if (requestSignal.timedOut()) {
        throw new ApiError(`Request timed out after ${timeoutMs} ms: ${label}`, {
          kind: "timeout",
          cause,
        });
      }
      if (signal?.aborted) {
        throw new ApiError(`Request cancelled: ${label}`, { kind: "aborted", cause });
      }
      throw new ApiError(`Network error while calling ${label}`, { kind: "network", cause });
    } finally {
      requestSignal.dispose();
    }

    let data: unknown = undefined;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch (cause) {
        if (response.ok) {
          throw new ApiError(`Invalid JSON in response from ${label}`, {
            kind: "parse",
            status: response.status,
            body: text,
            cause,
          });
        }
        data = text;
      }
    }

    if (!response.ok) {
      const error = new ApiError(`Request failed: ${label} (${response.status})`, {
        kind: "http",
        status: response.status,
        body: data,
      });
      if (error.isUnauthorized && onUnauthorized) await onUnauthorized(error);
      throw error;
    }

    if (!schema) return data as TResponse;

    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      throw new ApiError(`Unexpected response shape from ${label}`, {
        kind: "validation",
        status: response.status,
        body: data,
        cause: parsed.error,
      });
    }
    return parsed.data;
  }

  return {
    request,
    get: (path, options) => request("GET", path, options),
    post: (path, options) => request("POST", path, options),
    put: (path, options) => request("PUT", path, options),
    patch: (path, options) => request("PATCH", path, options),
    delete: (path, options) => request("DELETE", path, options),
  };
}
