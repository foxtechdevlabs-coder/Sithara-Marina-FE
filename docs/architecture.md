# Architecture

## One application, two areas

```
                    ┌──────────────────────── one Next.js app ────────────────────────┐
 Browser ──HTTPS──▶ │  src/app/(user)/…   customer website   (site / checkout / auth) │
                    │  src/app/admin/…    staff dashboard    (auth / console)          │
                    │                                                                  │
                    │  features/{user,admin} · components/{ui,shared,user,admin}       │
                    │  services/http (one client) · config · lib · validation          │
                    └───────────────────────────────┬──────────────────────────────────┘
                                                    │ fetch (NEXT_PUBLIC_API_BASE_URL)
                                                    ▼
                                   Backend API — separate team, separate repo
                   (authority for availability, pricing, holds, payments, auth, permissions)
```

The repository is a **single Next.js application at the repository root**: one `package.json`,
one lockfile, one build, one deployable server. It previously was an npm-workspaces monorepo with
two Next.js apps (`apps/user`, `apps/admin`) and a shared package; those contained only scaffolding
and were consolidated into this structure.

The user and admin areas are separated by **URL, layout and code ownership**, and ESLint enforces
the code boundaries:

| Area   | URLs                       | Route folder     | Features / components / services                                                                         |
| ------ | -------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------- |
| User   | everything except `/admin` | `src/app/(user)` | `features/user`, `components/user`, `services/user`, `config/user-navigation.ts`                         |
| Admin  | `/admin/*`                 | `src/app/admin`  | `features/admin`, `components/admin`, `services/admin`, `config/admin-navigation.ts`                     |
| Shared | —                          | —                | `components/ui`, `components/shared`, `lib`, `services/http`, `validation`, `constants`, `config/env.ts` |

- User-area code may not import admin-area modules, and vice versa.
- Shared code may not import either area.

## Routes and layouts

```
src/app/
├── layout.tsx              root layout: <html>/<body>, globals.css, env validation
├── globals.css             Tailwind + design tokens (imported once, here)
├── error.tsx  global-error.tsx  not-found.tsx
├── (user)/                 route group — not part of the URL
│   ├── (site)/             header + footer: /, /yachts, /yachts/[yachtId], …/availability,
│   │   │                   /about, /contact, /terms, /privacy, /cancellation-policy
│   │   └── account/        + account sub-nav: /account, /account/bookings, …/[bookingId],
│   │                       …/invoice, …/cancel
│   ├── (checkout)/         distraction-free: /checkout, /checkout/confirmation/[bookingId]
│   └── (auth)/             centred card: /login, /register
└── admin/                  /admin — layout sets noindex metadata, renders no chrome
    ├── page.tsx            /admin → redirects to /admin/dashboard
    ├── error.tsx           admin-styled error boundary
    ├── (auth)/login        /admin/login — centred, NO dashboard shell
    └── (console)/          sidebar + top bar: /admin/dashboard, /admin/fleet, /admin/fleet/new,
                            /admin/fleet/[yachtId], …/edit, …/pricing, /admin/availability,
                            …/slots, …/blocked, /admin/bookings, …/new, …/[bookingId],
                            /admin/customers[/…], /admin/partners[/…], /admin/commissions,
                            /admin/payouts, /admin/refunds, /admin/content, /admin/settings,
                            /admin/staff, /admin/staff/roles, /admin/notifications, /admin/reports
```

Why nested route groups: a layout cannot opt out of its parent's layout. The user area needs three
different shells (site, checkout, auth), so `(user)` contains three groups instead of one
`(user)/layout.tsx`. Likewise `admin/layout.tsx` renders no UI so that `/admin/login` does not get
the dashboard sidebar; the shell lives in `admin/(console)/layout.tsx`.

`/fleet/[yachtId]/pricing` was an **admin** route in the previous admin app (yacht pricing
management), so it now lives at `/admin/fleet/[yachtId]/pricing`, not in the user area.

`loading.tsx` exists in `(user)/(site)` and `admin/(console)` so navigation chrome stays visible
while a page loads. There is a single root `not-found.tsx` (Next.js renders it for every unmatched
URL).

## Feature modules

Business UI and logic for one domain live in `src/features/<area>/<feature>/`. Each feature folder
starts with a `README.md` recording its scope, routes and domain constraints.

- User: `home`, `yachts`, `availability`, `booking`, `checkout`, `payments`, `auth`, `profile`,
  `customer-bookings`, `invoices`, `cancellations`, `content`.
- Admin: `dashboard`, `fleet`, `pricing`, `availability`, `bookings`, `customers`, `partners`,
  `commissions`, `payouts`, `refunds`, `content`, `settings`, `staff`, `notifications`, `reports`,
  `auth`.

These are the existing, finer-grained modules carried over from the previous apps. They map to the
broader groupings sometimes used in planning as follows: _account_ → `profile`,
`customer-bookings`, `invoices`, `cancellations`; _yacht management_ → `fleet`, `pricing`,
`availability`; _booking management_ → `bookings`, `refunds`; _user management_ → `customers`,
`partners`, `staff`.

## Frontend / backend boundary

- One HTTP client (`src/services/http/api-client.ts`) built on native `fetch`. Service modules in
  `src/services/{user,admin}/` call it; components never call `fetch`.
- No endpoints, payloads or auth contracts are defined yet — none were provided. See
  [api-integration.md](api-integration.md#what-the-backend-team-must-provide).
- **The backend is the authority** for availability, pricing and fees, booking creation and
  confirmation, the ten-minute slot hold and its expiry, payment verification and status,
  cancellation rules, and authorization. The frontend displays these; it never decides them, and
  production code must never simulate a successful payment or confirmed booking.

## Authentication and authorization

**Current state: not implemented.** There is no login logic, session, token storage, logout or
route protection. Every admin page is currently reachable by anyone — this is a release blocker.

Responsibilities once the backend contract exists:

| Concern                           | Owner                                                                                  |
| --------------------------------- | -------------------------------------------------------------------------------------- |
| Verifying credentials, sessions   | Backend                                                                                |
| Authorizing every admin API call  | **Backend — mandatory.** Frontend checks are UX only.                                  |
| Session storage                   | Prefer httpOnly, Secure, SameSite cookies set by the backend                           |
| Redirecting signed-out users      | Frontend: `admin/(console)/layout.tsx`, `(site)/account/layout.tsx`, or `src/proxy.ts` |
| Reacting to 401 / expired session | Frontend: `onUnauthorized` in `api-client.ts`                                          |
| Hiding actions a role can't use   | Frontend (convenience, not security)                                                   |

The admin area sends `noindex, nofollow` (meta tag and `X-Robots-Tag` header). This only asks
search engines not to index it; it is **not** access control.

## Rendering model

Server Components by default. `"use client"` is used only where needed: the admin `SidebarNav`
(reads the current path) and the error boundaries (required by Next.js). `typedRoutes` is enabled,
so links and `PageProps` route literals are type-checked.

## Styling

One stylesheet, `src/app/globals.css`, imported once by the root layout. It defines separate token
sets for each area (`brand-*`/`surface` for the user area, `accent-*`/`canvas`/`panel`/`sidebar*`
for admin, plus shared `ink`/`muted`/`line`) so the two areas can look different without separate
builds. Tailwind v4 is configured in CSS; there is no `tailwind.config.js`.

## Dependency policy

Kept deliberately small. Not installed on purpose: state-management or data-fetching libraries,
UI kits, animation or charting libraries, `axios`, `clsx`/`tailwind-merge`. Add them only for a
demonstrated need.
