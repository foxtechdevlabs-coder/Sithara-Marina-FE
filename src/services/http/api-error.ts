/**
 * - `http`:       the server responded with a non-2xx status.
 * - `network`:    the request never received a response (offline, DNS, CORS).
 * - `timeout`:    no response within the configured timeout.
 * - `aborted`:    the caller cancelled the request through its `signal`.
 * - `parse`:      the response body was not valid JSON.
 * - `validation`: the response body did not match the expected Zod schema.
 */
export type ApiErrorKind = "http" | "network" | "timeout" | "aborted" | "parse" | "validation";

/**
 * The single error type thrown by `HttpClient`.
 *
 * The backend error-response format has not been agreed yet, so the raw
 * response body is kept in `body` as `unknown`. Once the contract is known,
 * add a typed parser for it rather than reading `body` ad hoc in components.
 */
export class ApiError extends Error {
  override readonly name = "ApiError";
  readonly kind: ApiErrorKind;
  /** HTTP status code, or `undefined` when no response was received. */
  readonly status: number | undefined;
  readonly body: unknown;

  constructor(
    message: string,
    options: { kind: ApiErrorKind; status?: number; body?: unknown; cause?: unknown },
  ) {
    super(message, { cause: options.cause });
    this.kind = options.kind;
    this.status = options.status;
    this.body = options.body;
  }

  /** 401 — not signed in, or the session has expired. */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** 403 — signed in but not permitted (enforced by the backend). */
  get isForbidden(): boolean {
    return this.status === 403;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
