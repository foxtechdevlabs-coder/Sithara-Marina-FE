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
src/config/env.ts                                NEXT_PUBLIC_API_BASE_URL, validated with Zod
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

## Authentication (not implemented)

When the contract is known:

- Prefer backend-issued **httpOnly, Secure, SameSite cookies**. Do not store tokens in
  `localStorage`/`sessionStorage`.
- Cookies on a different origin than the frontend need CORS with credentials
  (`init: { credentials: "include" }`) and appropriate `SameSite` settings — agree this with the
  backend team.
- Put header-based auth (if required) in `getHeaders` and session-expiry handling in
  `onUnauthorized`, both in `api-client.ts`.
- Protect pages in `admin/(console)/layout.tsx` and `(user)/(site)/account/layout.tsx` (or
  `src/proxy.ts`, which replaced `middleware.ts` in Next.js 16). These redirects are UX; **the
  backend must authorize every request**.

## Environment variables

| Variable                   | Exposed to browser | Purpose                                     |
| -------------------------- | ------------------ | ------------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | **Yes**            | Absolute base URL of the API (user + admin) |

- Copy `.env.example` to `.env.local` (git-ignored). The template value
  `http://localhost:4000/api` is a **placeholder**; the backend team must confirm host, port and
  prefix.
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
