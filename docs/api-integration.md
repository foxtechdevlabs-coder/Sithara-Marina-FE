# API integration

The backend is owned by a separate team and **no API contract has been provided yet**. This
document describes the integration boundary that exists today. It deliberately defines **no
endpoints, payloads or authentication scheme**.

## Layers

```
Page / Server Component / client hook
    │
    ▼
src/services/{user,admin}/<domain>.service.ts   one typed function per endpoint   (add when contract exists)
    │
    ▼
src/services/http/api-client.ts                  the single configured client
    │
    ▼
src/services/http/create-http-client.ts          fetch wrapper: URL, JSON, timeout, errors, validation
    │
    ▼
src/config/env.ts                                NEXT_PUBLIC_API_URL, validated with Zod
```

Rules: components never call `fetch`/`apiClient`; each endpoint has exactly one service function;
responses are validated with Zod before use; URLs come from environment variables.

## The HTTP client

`createHttpClient(options)` returns `get/post/put/patch/delete/request`. Behaviour (all covered by
`tests/integration/http-client.test.ts`):

| Feature             | Behaviour                                                                                       |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| Base URL            | String or function; the app passes a function so env is read lazily                             |
| Query params        | `query: { page: 2, tag: ["a","b"] }`; `null`/`undefined` omitted                                |
| Body                | Objects → JSON + `Content-Type`; `FormData`/`Blob`/strings passed through                       |
| Headers             | `Accept: application/json` by default; `getHeaders()` per request; request headers win          |
| Timeout             | `timeoutMs` (client default **15 s** in `api-client.ts`); per request `timeoutMs: n` or `false` |
| Cancellation        | `signal` from an `AbortController` (e.g. on unmount)                                            |
| Response validation | `schema: zodSchema` → typed, validated result                                                   |
| 401 handling        | `onUnauthorized(error)` hook, called once, then the error is thrown                             |
| Next.js options     | `init: { cache, next: { revalidate, tags } }` passed to `fetch`                                 |

**Memoization trade-off:** Next.js de-duplicates identical `GET` fetches during one server render,
but not when a `signal` is attached — and timeouts use a signal. For a service called by several
Server Components in one render, either wrap it in React's `cache()` or pass `timeoutMs: false`.

## Errors

Every failure throws `ApiError` (`src/services/http/api-error.ts`):

| `kind`       | Meaning                              | Typical handling                                                                                          |
| ------------ | ------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `http`       | non-2xx; `status` and raw `body` set | 404 → `notFound()`; 401 → sign-in; 403 → "not permitted"; 409 → explain & re-select; 5xx → error boundary |
| `timeout`    | no response within `timeoutMs`       | "Taking too long" + retry                                                                                 |
| `aborted`    | caller cancelled                     | usually ignore                                                                                            |
| `network`    | no response (offline, DNS, CORS)     | retry message                                                                                             |
| `parse`      | 2xx with invalid JSON                | treat as server error                                                                                     |
| `validation` | response didn't match the Zod schema | treat as server error; report it                                                                          |

Helpers: `isApiError(e)`, `error.isUnauthorized` (401), `error.isForbidden` (403). Handle expected
errors near where they occur; let unexpected ones reach `error.tsx`. `body` is `unknown` until the
backend defines its error format — then add one parser for it. Never show raw server messages to
customers.

## Writing a service (once a contract exists)

Illustrative only — the path and fields are **not** a real contract.

```ts
// src/services/user/yachts.service.ts
import { z } from "zod";

import { apiClient } from "@/services/http/api-client";

const yachtSchema = z.object({ id: z.string(), name: z.string() /* …per contract */ });
export type Yacht = z.infer<typeof yachtSchema>;

export function getYacht(yachtId: string): Promise<Yacht> {
  return apiClient.get(`/yachts/${encodeURIComponent(yachtId)}`, { schema: yachtSchema });
}
```

## Booking-flow rules

- Availability, prices, fees, taxes, slot holds, payment status and confirmation come from the API.
- Slot hold: use the hold id and expiry the API returns; any countdown is display-only. On expiry,
  payment failure or abandonment, return the customer to slot selection.
- Show a booking as confirmed only when the API says so (the confirmation page must load it from
  the API, not from checkout state).
- Disable submit buttons while pending; send idempotency keys if the backend supports them.

## Customer authentication

Backend: `NEXT_PUBLIC_API_BASE_URL` from the root `.env` (NestJS; spec at `<base URL>/docs`, JSON
at `<base URL>/docs-json`). Implemented in `src/services/user/auth.service.ts` (paths in
`AUTH_PATHS`):

| Function                 | Endpoint                         | Used by                                  |
| ------------------------ | -------------------------------- | ---------------------------------------- |
| `registerUser()`         | `POST /auth/register`            | `/register`                              |
| `verifyEmail()`          | `POST /auth/verify-email`        | `/verify-email#token=…` or `?token=…`    |
| `resendVerification()`   | `POST /auth/resend-verification` | `/verify-email/{failed,pending}`, bad link |
| `loginUser()`            | `POST /auth/login`               | `/login` (then `?next=` or home)         |
| `requestPasswordReset()` | `POST /auth/forgot-password`     | `/forgot-password`, "Request a new link" |
| `verifyResetLink()`      | `POST /auth/verify-reset-link`   | `/reset-password?token=…`                |
| `resetPassword()`        | `POST /auth/reset-password`      | `/reset-password` (then `/login`)        |
| `refreshSession()`       | `POST /auth/refresh`             | HTTP client, automatically on 401        |
| `logoutSession()`        | `POST /auth/logout` (bearer)     | `signOut()` in `session.ts` (no UI yet)  |

- Request bodies contain exactly the documented fields (the backend rejects extra fields).
  Responses are validated with Zod. Auth calls use a 60 s timeout (the Render instance can take
  ~40 s to wake up) and `auth: false`, so a 401 from e.g. a wrong password never triggers a refresh.
- **Unconfirmed response shapes:** Swagger declares no response schema for `/auth/login`,
  `/auth/refresh` or `/auth/me`. Login is validated against `AuthResponseDto` (documented for
  verify-email); refresh requires a new `access_token` and `refresh_token` (`user` optional).
  A different shape fails validation instead of creating a broken session.
- Error bodies (observed, not in the spec): domain errors `{ statusCode, code, message }`;
  validation errors `{ statusCode: 400, error, message: string[] }`; 401s
  `{ statusCode, message, error? }`. Read them with `getBackendErrorDetails()`.
  `ApiError.retryAfterSeconds` reads `Retry-After`. Login returns the same 401 "Invalid email or
  password" for wrong credentials **and for unverified accounts**.
- **Links are token-based**, not six-digit codes: `/verify-email#token=<id>.<secret>` (`?token=` is
  also accepted) and
  `/reset-password?token=<id>.<secret>` (link format to be confirmed by the backend team). Each
  page reads the token, removes it from the address bar and posts it exactly once. The
  short-lived `reset_token` (`expires_in`, currently 600 s) is kept in memory only.

### Email verification routes

These are frontend pages, not API endpoints. The backend exposes only `POST` JSON endpoints and
performs **no redirects**: the emailed link opens the frontend directly, and the frontend picks
the status page from the `POST /auth/register` result.

| Route                   | Reached from                                       | Query params         |
| ----------------------- | -------------------------------------------------- | -------------------- |
| `/verify-email`         | Link in the verification email (callback)          | `#token=<id>.<secret>` or `?token=` |
| `/verify-email/success` | Register 201 (email accepted for sending)          | None                 |
| `/verify-email/failed`  | Register 503 `EMAIL_DELIVERY_FAILED`               | None                 |
| `/verify-email/pending` | Sign-in 401 link, register 429, `/verify-email` with no token | None      |

- The email address reaches the status pages through `sessionStorage`, never the URL. `success`
  and `failed` hand over to `pending` when this tab has no registration.
- `/verify-email` shows the Welcome screen (Continue → home) only after a 200. It is local state,
  not a route.
- Register 503 `SERVICE_UNAVAILABLE` stays on the form: the spec does not say the account was
  saved, so resubmitting (not resending) is the safe retry.
- Resend answers 200 even when the email could not be sent, so its success text stays neutral.

### Session and refresh

- **Storage:** the backend returns `access_token` and `refresh_token` in the JSON body and sets no
  cookies. They are kept in `sessionStorage` (tab-scoped, cleared when the tab closes) by
  `src/features/user/auth/session.ts` (`useAuthSession()`), never in `localStorage`; passwords and
  reset tokens are never stored. Script-readable storage is exposed to XSS — see below.
- **Bearer + refresh:** the customer session registers handlers (`src/services/http/auth-handlers.ts`,
  mounted on every customer page by `src/app/(user)/layout.tsx`). The shared client attaches
  `Authorization: Bearer` to requests (unless `auth: false`). On a 401 it runs **one** refresh at
  a time (concurrent 401s and new requests wait for it), retries each request **once**, and never
  loops. The refresh token is single use and rotated, so the new pair replaces the old one.
- **Failure:** an invalid/revoked refresh token (401/400) clears the session and redirects to
  `/login?next=<current page>` with a "session expired" notice. A network failure during refresh
  keeps the session. `?next=` only accepts same-site paths (open-redirect guard).
- **Logout:** `signOut()` calls `POST /auth/logout` (never retried via refresh) and always clears
  the local session. No sign-out button exists yet (the header was not changed).
- **Moving to httpOnly cookies** needs backend changes: set the refresh (and ideally access) token
  as `HttpOnly; Secure; SameSite` cookies on login / verify-email / refresh, read the refresh token
  from the cookie in `/auth/refresh` and `/auth/logout`, add CSRF protection, and keep CORS
  `credentials: true` with explicit origins (the frontend would send `credentials: "include"`).
  Alternatively a Next.js server-side proxy could hold the tokens in httpOnly cookies.
- Hiding UI or redirecting is UX only — **the backend must authorize every request**.

### Known backend gaps

1. **CORS:** `http://localhost:3001` (this app's dev port) is allowed. The production frontend
   origin must be confirmed.
2. `Retry-After` is sent but not listed in `Access-Control-Expose-Headers`, so browsers can't read
   it; the UI falls back to the documented 60 s cooldown (or "up to an hour" for
   `TOO_MANY_EMAILS`).
3. No response schemas for `/auth/login`, `/auth/refresh`, `/auth/me`; the link formats (and the
   frontend URL used in emails) are not documented.
4. Registering an `@example.com` address returned `503 EMAIL_DELIVERY_FAILED`; delivery to real
   inboxes was not verified.

## Environment variables

| Variable              | Exposed to browser | Purpose                                     |
| --------------------- | ------------------ | ------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | **Yes**            | Absolute base URL of the API (user + admin) |

- Copy `.env.example` to `.env.local` (git-ignored). The hosted backend is
  `https://sithara-backend.onrender.com`, with no `/api` prefix (reference:
  <https://sithara-backend.onrender.com/docs>, health: <https://sithara-backend.onrender.com/health>).
  To use a backend running locally instead, set `http://localhost:3000`. In deployments, set the
  same variable in the platform's environment settings and redeploy.
- The hosted backend is on Render's free tier: the first request after it has been idle can take
  up to about a minute while it wakes up.
- `NEXT_PUBLIC_API_BASE_URL` (the previous name) is still accepted as a fallback.
- `NEXT_PUBLIC_*` values are **inlined at build time** into browser JavaScript: never put secrets
  in them, and build with the target environment's values. `next build` fails if the variable is
  missing or not an absolute URL (validated in `src/app/layout.tsx`).
- Server-only variables (no prefix) are available only in server code. If one is needed: add it to
  `.env.example` with a placeholder, validate it in `src/config/server-env.ts` starting with
  `import "server-only";` (install `server-only`), and never re-export it through `env.ts`.

## What the backend team must provide

1. Base URL(s) per environment and the API path prefix; whether the browser calls the API directly
   (CORS) or through a same-origin proxy.
2. Authentication contract for customers and for staff: login/logout/refresh endpoints, cookie vs
   header, cookie names/domains/SameSite, CSRF protection, session lifetime and expiry signalling.
3. Authorization model: staff roles and permissions, and the response for forbidden actions.
4. Error response format (fields, codes) and which status codes each endpoint returns.
5. Resource schemas: yachts (incl. company- vs partner-owned), gallery, crew, amenities, policies,
   add-ons, slot types and durations, pricing/tax breakdown, bookings, invoices, cancellations,
   customers, partners, commissions, payouts, refunds, content, settings, notifications, reports.
6. Availability query and slot-hold contract: how a hold is created, its id, expiry timestamp,
   extension/release, and the error when a slot is taken.
7. Payment flow: provider, redirect/embedded flow, return URLs, how the frontend learns the final
   status (polling, webhook-backed status endpoint), and failure/abandonment states.
8. Pagination, filtering and sorting conventions; date/time zone and currency formats.
9. Rate limits, idempotency-key support, and an OpenAPI (or equivalent) specification.
