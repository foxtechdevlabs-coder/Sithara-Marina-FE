# Sithara Marina — Frontend

Frontend for the **Sithara Marina Yacht Charter Booking Platform**: a single Next.js application
with two clearly separated areas.

- **User area** — the customer website (`/`, `/yachts`, `/checkout`, `/account`, …)
- **Admin area** — the staff dashboard (`/admin/login`, `/admin/dashboard`, `/admin/fleet`, …)

The backend API is built and hosted by a separate team. This repository contains no backend.

> **Status:** architecture, tooling and tests are in place. Every route is still a clearly marked
> starter placeholder. **No booking, payment, authentication or backend integration is
> implemented yet.** See [Production readiness](docs/deployment.md#production-readiness).

## Technology

Next.js 16.4 (App Router, Turbopack) · React 19.3 · TypeScript 5.9 (strict) · Tailwind CSS 4.3 ·
Zod 4 · Lucide icons · ESLint 9 · Prettier 3 · Vitest 4 · Playwright 1.63 · npm 11.

## Prerequisites

- **Node.js 24.22.1** (see [`.nvmrc`](.nvmrc); the current Node 24 LTS security release)
- **npm 11** (bundled with Node 24)

## Getting started

```bash
npm install
cp .env.example .env.local        # Windows Command Prompt: copy .env.example .env.local
npm run dev                       # http://localhost:3000  (admin: /admin)
```

## Commands

| Command                | What it does                                               |
| ---------------------- | ---------------------------------------------------------- |
| `npm run dev`          | Development server on port 3000                            |
| `npm run build`        | Production build (fails if required env vars are missing)  |
| `npm run start`        | Serve the production build (port 3000, or `-- --port <n>`) |
| `npm run lint`         | ESLint, including user/admin import boundaries             |
| `npm run typecheck`    | Generate route types, then `tsc --noEmit`                  |
| `npm run format`       | Format with Prettier                                       |
| `npm run format:check` | Verify formatting                                          |
| `npm test`             | Unit + integration tests (Vitest)                          |
| `npm run test:watch`   | Vitest in watch mode                                       |
| `npm run test:e2e`     | End-to-end tests (Playwright) against a production server  |
| `npm run check`        | typecheck + lint + format:check + test                     |

`test:e2e` needs a prior `npm run build` and a one-time `npx playwright install chromium`.
Details: [docs/testing.md](docs/testing.md).

## Environment

| Variable                   | Required | Exposed to browser | Purpose                      |
| -------------------------- | -------- | ------------------ | ---------------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | Yes      | Yes                | Absolute base URL of the API |

The value in `.env.example` is a placeholder; the backend team must confirm the real URL. Never
put secrets in `NEXT_PUBLIC_*` variables. See [docs/api-integration.md](docs/api-integration.md).

## Deployment (overview)

One install, one build, one Node.js server: `npm ci` → set `NEXT_PUBLIC_API_BASE_URL` →
`npm run check` → `npm run build` → `npm run start`. Full guide and smoke checks:
[docs/deployment.md](docs/deployment.md).

## Documentation

- [Architecture](docs/architecture.md) — single app, user/admin separation, backend boundary, auth
- [Folder structure](docs/folder-structure.md) — where new code goes
- [Development setup](docs/development-setup.md) — Node version, Windows setup, troubleshooting
- [Coding conventions](docs/coding-conventions.md)
- [API integration](docs/api-integration.md) — HTTP client, errors, env vars, what the backend must supply
- [Testing](docs/testing.md)
- [Deployment](docs/deployment.md) — build, environment, smoke checks, production readiness
