# Testing

| Level       | Tool                         | Location             | Command                               |
| ----------- | ---------------------------- | -------------------- | ------------------------------------- |
| Unit        | Vitest 4                     | `tests/unit/`        | `npm test`                            |
| Integration | Vitest 4                     | `tests/integration/` | `npm test`                            |
| End-to-end  | Playwright 1.63              | `tests/e2e/`         | `npm run test:e2e`                    |
| Static      | TypeScript, ESLint, Prettier | —                    | `npm run check` (includes `npm test`) |

## Unit and integration (Vitest)

```bash
npm test             # run once
npm run test:watch   # watch mode
```

Configured in `vitest.config.ts` (Node environment, `@/` alias). Current coverage:

- `tests/unit/build-url.test.ts`, `cx.test.ts` — helpers
- `tests/unit/email-schema.test.ts` — shared Zod schema
- `tests/unit/env.test.ts` — env validation, including the missing-variable failure
- `tests/unit/routes.test.ts` — route builders; regression test that every admin route stays under
  `/admin` and no user route does
- `tests/integration/http-client.test.ts` — the real HTTP client against a stubbed `fetch`: query
  strings, JSON/FormData bodies, header merging, lazy base URL, 204, schema validation, invalid
  JSON, HTTP errors, 401 `onUnauthorized`, 403, network errors, timeouts, per-request timeout
  override, cancellation, and that no signal is attached when not needed

There are no component tests yet (no interactive components exist). When they are needed, add
`@testing-library/react` and `jsdom` and set `environment: "jsdom"` for those files.

## End-to-end (Playwright)

```bash
npx playwright install chromium   # once per machine / Playwright version
npm run build                     # e2e runs against the production build
npm run test:e2e
```

`playwright.config.ts` starts `next start` on port 3100 (reusing a running server locally) and runs
every spec in two projects: `desktop-chromium` and `mobile-chromium` (Pixel 7 viewport).

Specs:

- `user-area.spec.ts` — home in the site layout; home → yachts → yacht detail → availability;
  checkout uses the distraction-free layout and shows no confirmed booking; auth pages without site
  nav; all account pages with account nav; footer links to every content page; 404 page; no
  admin robots header on user pages; no horizontal overflow
- `admin-area.spec.ts` — `/admin` → `/admin/dashboard`; `/admin/login` renders without the
  dashboard shell (migration regression); dashboard uses admin shell, not customer layout; sidebar
  navigation and `aria-current`; admin dynamic routes; `noindex` header + meta; no overflow
- `security-headers.spec.ts` — baseline security headers on user, admin and 404 responses; no
  `X-Powered-By`

### Against a deployed environment

```bash
E2E_BASE_URL=https://staging.example.com npm run test:e2e
```

No local server is started when `E2E_BASE_URL` is set; use this as a post-deployment smoke test.

## What is NOT tested (and why)

No backend exists for these tests, and every page is a placeholder. Therefore the following are
**not verified**: real yacht data, availability checks, slot holds, checkout and payment,
booking confirmation, customer sign-in and account data, admin sign-in, admin authorization,
and expired-session flows in the browser. The HTTP client's error, 401 and timeout handling is
verified only at the integration level with a stubbed `fetch`. Add contract tests and API-backed
e2e journeys when the backend contract and a test environment exist.
