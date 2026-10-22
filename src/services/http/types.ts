import type { ZodType } from "zod";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type QueryValue = string | number | boolean | null | undefined;

/** Query-string parameters. `null` / `undefined` values are omitted. */
export type QueryParams = Record<string, QueryValue | readonly QueryValue[]>;

/**
 * Options for a single request made through an `HttpClient`.
 *
 * `init` is passed through to `fetch`, so Next.js-specific options such as
 * `next: { revalidate }` or `cache` remain available.
 */
export interface RequestOptions<TResponse = unknown> {
  query?: QueryParams;
  /** Serialised as JSON unless it is already a `BodyInit` (e.g. `FormData`). */
  body?: unknown;
  headers?: HeadersInit;
  /** Cancels the request, e.g. when a component unmounts. */
  signal?: AbortSignal;
  /**
   * Overrides the client's default timeout for this request.
   * `false` disables the timeout (see docs/api-integration.md on memoization).
   */
  timeoutMs?: number | false;
  /**
   * Optional Zod schema used to validate the response body at runtime.
   * Recommended once the backend contract for an endpoint is confirmed.
   */
  schema?: ZodType<TResponse>;
  init?: Omit<RequestInit, "body" | "method" | "headers" | "signal">;
}
