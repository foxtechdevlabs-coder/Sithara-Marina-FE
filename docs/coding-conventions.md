# Coding conventions

Formatting is automated (Prettier); many rules are enforced (ESLint, TypeScript strict). This
covers what tools cannot decide.

## Naming

| Thing               | Convention                                      | Example                           |
| ------------------- | ----------------------------------------------- | --------------------------------- |
| Folders             | `kebab-case`                                    | `customer-bookings/`              |
| Component files     | `kebab-case.tsx`                                | `yacht-card.tsx`                  |
| Other modules       | `kebab-case.ts`                                 | `build-url.ts`                    |
| Hooks               | `use-<name>.ts`                                 | `use-hold-countdown.ts`           |
| API service modules | `<domain>.service.ts`                           | `services/user/yachts.service.ts` |
| Zod schema modules  | `<thing>.schema.ts`                             | `guest-details.schema.ts`         |
| Tests               | `<subject>.test.ts` / `<journey>.spec.ts` (e2e) | `build-url.test.ts`               |
| Dynamic segments    | `[camelCaseId]`                                 | `[yachtId]`                       |
| Route groups        | `(lowercase)`                                   | `(site)`, `(console)`             |

- Components `PascalCase`; pages `<Name>Page`; layouts `<Name>Layout`; props `<Component>Props`.
- Hooks `useCamelCase`; booleans read as questions (`isActive`).
- True constants `UPPER_SNAKE_CASE` (`BRAND_NAME`); config objects `camelCase` (`userRoutes`).
- Service functions start with a verb: `getYacht`, `listBookings`, `createHold`.

## Exports and imports

- Named exports everywhere, except where Next.js requires a default export (`page`, `layout`,
  `loading`, `error`, `not-found`, config files).
- No barrel (`index.ts`) files — import from the defining file.
- Use the `@/` alias for anything outside the current folder; `./` only for siblings.
- `import type` for type-only imports.
- Order: packages (alphabetical), then `@/…`, then relative — groups separated by a blank line.
- **Area boundaries (ESLint-enforced):** user-area files may not import `@/features/admin/*`,
  `@/components/admin/*`, `@/services/admin/*` or admin navigation, and vice versa; shared folders
  may import neither area. If two areas need something, move it to a shared folder.

## TypeScript

- `strict`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch` are on.
- No `any` (ESLint error). Use `unknown` and narrow. Justify any unavoidable exception in a comment.
- No `@ts-ignore`, no `typescript.ignoreBuildErrors`, no disabling lint rules to pass CI.
- Validate API data with Zod; derive types with `z.infer`. Avoid `as` casts on API data.
- Use `PageProps<"/route/[param]">`; `params` and `searchParams` are Promises — `await` them.
- Build links with `userRoutes` / `adminRoutes` (typed routes are enabled).

## Components

- Server Components by default; put `"use client"` on the smallest component that needs it.
- Route files stay thin; business UI lives in `src/features/<area>/<feature>/components/`.
- Never call `fetch` or `apiClient` from a component — call a service function.
- Accept and forward `className` on reusable components; join with `cx`.
- Handle loading (Suspense / `loading.tsx`), empty, error and success states explicitly.
- Never render untrusted HTML. If it is unavoidable, sanitize it first and document why.
- Don't log personal data, tokens or full API error bodies to the browser console.

## Styling

- Use design tokens (`bg-brand-700`, `bg-sidebar`, `text-muted`), not raw hex values.
- User-area components use the user tokens; admin components use the admin tokens.
- Add tokens in `src/app/globals.css`.

## Accessibility

- Semantic elements; one `<h1>` per page; `<nav aria-label>` for each navigation.
- Decorative icons `aria-hidden="true"`; icon-only buttons need `aria-label`.
- Labels for every input; errors as text, not colour alone.
- `aria-current="page"` for the active navigation item; keep visible focus styles.

## Before opening a pull request

`npm run check` and `npm run build` must pass; run `npm run test:e2e` for routing/layout changes.
