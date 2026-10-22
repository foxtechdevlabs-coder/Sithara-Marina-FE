# Deployment

The project is **one Next.js application** producing **one build** that serves both the user area
and the admin area (`/admin`).

## Requirements on the host

- Node.js **24.22.1** (or a later Node 24 security release) for build and runtime
- The ability to run a long-lived Node.js process (`next start`) — the app uses server rendering
  (dynamic routes, redirects, response headers), so it cannot be deployed as a purely static
  export
- Environment variables available **at build time** (`NEXT_PUBLIC_*` values are inlined)
- HTTPS termination in front of the app (load balancer, reverse proxy or platform)

No particular hosting provider is assumed. If you use a managed platform, check its Next.js 16
support (App Router, `next start` or its adapter, build-time environment variables) before relying
on it.

## Build and run

```bash
npm ci                                   # exact lockfile install
export NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api   # real value from the backend team
npm run check                            # typecheck, lint, format, unit/integration tests
npm run build                            # one production build in .next/
npm run start -- --port 3000             # or set PORT
```

Windows PowerShell: `$env:NEXT_PUBLIC_API_BASE_URL = "https://…"` instead of `export`.

`npm run build` **fails** if `NEXT_PUBLIC_API_BASE_URL` is missing or not an absolute URL.

Because `NEXT_PUBLIC_API_BASE_URL` is baked in at build time, build **once per environment**
(staging, production) with that environment's value, or choose a runtime-configuration approach
deliberately later.

### Artifacts

`next start` needs `.next/`, `node_modules/` (production dependencies), `package.json` and
`next.config.ts`. For container images, consider Next.js `output: "standalone"`; it is not enabled
today, and enabling it changes how the server is started (`node .next/standalone/server.js`), so
test it before switching.

### Recommended CI pipeline

1. `npm ci`
2. `npm run check`
3. `npm run build` (with the target environment's variables)
4. `npx playwright install --with-deps chromium && npm run test:e2e`
5. `npm audit --omit=dev` (runtime dependencies) — review any finding
6. Deploy the build; run the smoke checks below

## Environment variables

| Variable                   | Required | When       | Notes                                 |
| -------------------------- | -------- | ---------- | ------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | Yes      | Build time | Absolute URL; public — never a secret |
| `PORT`                     | No       | Runtime    | Port for `next start` (default 3000)  |

## HTTP headers sent by the app

All routes: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(),
geolocation=()`; `X-Powered-By` is disabled. `/admin/*` also: `X-Robots-Tag: noindex, nofollow`.

Configure at the proxy / platform: `Strict-Transport-Security` (HSTS), TLS, compression, and —
once third-party scripts such as a payment provider are known — a `Content-Security-Policy`.

## Post-deployment smoke checks

Automated (from any machine with the repo):

```bash
E2E_BASE_URL=https://<deployed-host> npm run test:e2e
```

Manual / scripted:

| Check                 | Expected                                                                                                                                                             |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /`               | 200, customer site with header and footer                                                                                                                            |
| `GET /yachts/test-id` | 200 (dynamic route)                                                                                                                                                  |
| `GET /checkout`       | 200, no main site navigation                                                                                                                                         |
| `GET /admin`          | 307 → `/admin/dashboard`                                                                                                                                             |
| `GET /admin/login`    | 200, `X-Robots-Tag: noindex, nofollow`                                                                                                                               |
| `GET /unknown-path`   | 404 not-found page                                                                                                                                                   |
| Response headers      | security headers above; no `X-Powered-By`                                                                                                                            |
| API connectivity      | **Not yet checkable** — no page calls the API. Once services exist, verify a read-only endpoint from the deployed site and check the browser console for CORS errors |

## Dependency audit

Status at the last review (`npm audit`): **5 high, 0 critical, 0 moderate** — all one advisory:

- `braces` ≤ 3.0.3 — GHSA-vfj7-8cjw-p6xm (stack-exhaustion DoS with deeply nested patterns).
  Chain: `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → `micromatch` → `braces`.
  **No patched `braces` release exists** (3.0.3 is the latest), and npm's suggested fix would
  downgrade to Next 14's ESLint config. It is **development-only lint tooling** that processes the
  project's own file globs; it is not installed by `npm ci --omit=dev` and not shipped to browsers.
  Production impact: none known. Re-check when `eslint-config-next` or `braces` is updated.

Resolved during the migration:

- `next` 16.3.8 → **16.4.2**: fixes critical GHSA-673q-mjm6-r5xr (RCE in `use cache` with typed
  arrays), critical GHSA-2464-fhr4-w9xw (RCE in Image Optimization with SVG; also requires
  `sharp ≥ 0.35.5`, installed: 0.35.5) and high GHSA-p3m5-59mp-jv5r (Server Actions DoS). These
  were **not** reported by `npm audit` at the time — always also check the Next.js security
  advisories page.
- `vitest` 4.1.11 → **4.1.12**: fixes GHSA-qxg6-89mg-rqv8 and GHSA-xp26-3454-mjgp (dev only).

## Production readiness

**Not ready for release.** The deployment pipeline works, but the application has no product
functionality yet. Blockers:

1. No backend integration — no real data, availability, booking, payment or confirmation.
2. No authentication; **admin pages are publicly reachable**. Must not be exposed publicly until
   staff auth is implemented and the backend enforces authorization (consider network-level
   restriction of `/admin` meanwhile).
3. All pages are placeholders; no forms or validation UI exist.
4. No Content-Security-Policy; HSTS must be configured at the edge.
5. No error-reporting/monitoring service (errors go to `console.error` only).
6. API connectivity, CORS and cookie behaviour cannot be verified until the backend exists.
