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
 * Error body sent by the Sithara Marina backend (NestJS):
 * `{ statusCode, code?, message, error? }`, where `message` is a string, or
 * a list of messages for validation errors (400).
 */
export interface ApiErrorBody {
  statusCode?: number;
  /** Machine-readable code, e.g. "TOO_MANY_LOGIN_ATTEMPTS". Not always present. */
  code?: string;
  message?: string | string[];
  error?: string;
}

/**
 * The single error type thrown by `HttpClient`.
 *
 * The raw response body is kept in `body`; use `code`, `messages` and
 * `retryAfterSeconds` rather than reading `body` ad hoc in components.
 */
export class ApiError extends Error {
  override readonly name = "ApiError";
  readonly kind: ApiErrorKind;
  /** HTTP status code, or `undefined` when no response was received. */
  readonly status: number | undefined;
  readonly body: unknown;
  /** Response headers, when a response was received. */
  readonly headers: Headers | undefined;

  constructor(
    message: string,
    options: {
      kind: ApiErrorKind;
      status?: number;
      body?: unknown;
      headers?: Headers;
      cause?: unknown;
    },
  ) {
    super(message, { cause: options.cause });
    this.kind = options.kind;
    this.status = options.status;
    this.body = options.body;
    this.headers = options.headers;
  }

  private get parsedBody(): ApiErrorBody | undefined {
    return this.body && typeof this.body === "object" ? (this.body as ApiErrorBody) : undefined;
  }

  /** Backend error code (e.g. "INVALID_TOKEN"), when the body has one. */
  get code(): string | undefined {
    return typeof this.parsedBody?.code === "string" ? this.parsedBody.code : undefined;
  }

  /** Backend message(s) as a list; validation errors return several. */
  get messages(): string[] {
    const message = this.parsedBody?.message;
    if (Array.isArray(message)) return message.filter((m) => typeof m === "string");
    return typeof message === "string" ? [message] : [];
  }

  /** Seconds from the `Retry-After` header (429 / 503), if sent. */
  get retryAfterSeconds(): number | undefined {
    const value = this.headers?.get("Retry-After");
    if (!value) return undefined;
    const seconds = Number(value);
    if (Number.isFinite(seconds)) return Math.max(0, Math.ceil(seconds));
    const date = Date.parse(value);
    return Number.isNaN(date) ? undefined : Math.max(0, Math.ceil((date - Date.now()) / 1000));
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
