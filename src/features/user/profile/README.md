# Feature: `profile` (user area)

**Scope:** Customer account details, password and notification preferences.

**Routes:** `/account/profile` (+ `/saved`, `/email`), `/account/security` (+ `/updated`),
`/account/notifications` (+ `/saved`), all under `src/app/(user)/(account)/account/(panel)`.
The account overview is `/account`.

```
profile/
├── components/   profile-form.tsx, email-change.tsx, security-settings.tsx,
│                 notification-preferences.tsx, profile-confirmations.tsx
│                 profile-details-form.tsx — earlier standalone form, not routed
└── types/        profile.schema.ts — Zod schemas used by profile-details-form.tsx
```

- The account sidebar and mobile "My account" bar live in `src/features/user/account`
  (`account-shell.tsx`). `src/components/user/account-nav.tsx` is the earlier sidebar and is not
  rendered.
- `src/services/user/profile.service.ts` returns **mock data** (see `src/services/user/mocks`)
  until the account API exists; each function keeps the Zod schema the real response must match.

See [docs/folder-structure.md](../../../../docs/folder-structure.md).
