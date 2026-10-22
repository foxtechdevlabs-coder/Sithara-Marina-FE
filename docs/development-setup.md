# Development setup

## Requirements

| Tool    | Version            | Notes                                                                                                      |
| ------- | ------------------ | ---------------------------------------------------------------------------------------------------------- |
| Node.js | **24.22.1**        | Current Node 24 LTS, a security release (20 Oct 2026). Next.js needs ≥ 20.9; Vitest needs ^20, ^22 or ≥ 24 |
| npm     | **11.x** (bundled) |                                                                                                            |
| Git     | any recent         |                                                                                                            |

`package.json` declares `"engines": { "node": ">=24.22.1" }` (npm warns on older versions).

`.nvmrc` records the version for version managers; it does **not** switch Node.js by itself, and
Command Prompt / PowerShell ignore it. nvm-windows: `nvm install 24.22.1 && nvm use 24.22.1`.
fnm: `fnm use`. nvm (macOS/Linux): `nvm use`.

## First-time setup

Windows (PowerShell or Command Prompt):

```powershell
npm install
copy .env.example .env.local
npm run dev
```

macOS / Linux / Git Bash: same, with `cp .env.example .env.local`.

Open <http://localhost:3000> (user area) and <http://localhost:3000/admin> (admin area).

For end-to-end tests, also run once: `npx playwright install chromium`.

### VS Code

Recommended extensions: ESLint, Prettier, Tailwind CSS IntelliSense. Use the workspace TypeScript
version (`Ctrl+Shift+P` → "TypeScript: Select TypeScript Version" → "Use Workspace Version") so
the Next.js TypeScript plugin works.

## Daily commands

| Command            | Notes                                                                   |
| ------------------ | ----------------------------------------------------------------------- |
| `npm run dev`      | Turbopack dev server, port 3000. `npm run dev -- --port 3005` to change |
| `npm run check`    | typecheck + lint + format:check + unit/integration tests                |
| `npm run build`    | Needs `.env.local` (or real env vars) — fails otherwise                 |
| `npm run start`    | Serve the last build                                                    |
| `npm run test:e2e` | Build first; starts `next start` on port 3100 automatically             |

`npm run typecheck` runs `next typegen` first, which generates the `PageProps`/`LayoutProps`
helpers and typed-route definitions that `tsc` needs.

## Selected versions

All versions are pinned exactly; the lockfile is committed.

| Package                               | Version       | Reason                                                                                                                                     |
| ------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `next`, `eslint-config-next`          | 16.4.2        | 16.4.1+ fixes critical RCEs GHSA-673q-mjm6-r5xr, GHSA-2464-fhr4-w9xw and high DoS GHSA-p3m5-59mp-jv5r; 16.3.x is affected and has no patch |
| `react`, `react-dom`                  | 19.3.1        | Next 16.4 pairs with React 19.3; 19.3.1 is the RSC transport-protocol fix release                                                          |
| `@types/react`, `@types/react-dom`    | 19.3.0        | Latest for React 19.3                                                                                                                      |
| `typescript`                          | 5.9.3         | `typescript-eslint` requires < 6.1, so TS 7 is not usable                                                                                  |
| `eslint`                              | 9.39.5        | `eslint-config-next`'s React/import/a11y plugins don't support ESLint 10                                                                   |
| `eslint-config-prettier`, `prettier`  | 10.1.8, 3.9.9 |                                                                                                                                            |
| `tailwindcss`, `@tailwindcss/postcss` | 4.3.3         |                                                                                                                                            |
| `zod`                                 | 4.6.7         | Same version `eslint-plugin-react-hooks` needs → one copy                                                                                  |
| `lucide-react`                        | 1.50.0        | React 19 compatible                                                                                                                        |
| `vitest`                              | 4.1.12        | 4.1.12 fixes GHSA-qxg6-89mg-rqv8 / GHSA-xp26-3454-mjgp in `@vitest/mocker`; 4.x chosen over the new 5.x major                              |
| `@playwright/test`                    | 1.63.0        |                                                                                                                                            |
| `@types/node`                         | 24.19.2       | Matches Node 24                                                                                                                            |

Upgrade `next` + `eslint-config-next` together and `react` + `react-dom` + `@types/react*`
together, then run `npm run check`, `npm run build` and `npm run test:e2e`. Bundled Next.js docs
for the installed version are in `node_modules/next/dist/docs/`.

## Troubleshooting

- **Build fails with `Invalid public environment configuration`** — create `.env.local` from
  `.env.example`, or set `NEXT_PUBLIC_API_BASE_URL` in the environment. Restart `next dev` after
  changing env files.
- **`Port 3000 is in use`** — PowerShell: `Get-NetTCPConnection -LocalPort 3000 | Select OwningProcess`,
  then `Stop-Process -Id <pid>`.
- **`Cannot find name 'PageProps'`** in the editor — run `npm run typecheck` (or `npm run dev`) once.
- **Playwright: `Executable doesn't exist`** — run `npx playwright install chromium`.
- **Playwright: `Could not find a production build`** — run `npm run build` before `npm run test:e2e`.
- **Line-ending noise on Windows** — `.gitattributes` enforces LF; run `git add --renormalize .` once.
- **`npm warn install-scripts … unrs-resolver`** — npm 11 asks before running dependency install
  scripts. Linting works without it.
- **`npm audit` reports 5 high (`braces`)** — known, dev-only; see
  [deployment.md](deployment.md#dependency-audit).
