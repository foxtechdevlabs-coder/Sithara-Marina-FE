# Feature: `profile` (user area)

**Scope:** Customer account details.

**Routes:** `/account/profile` (`/account` redirects here until the account overview exists)

```
profile/
├── components/   profile-details-form.tsx — the "Your details" form
└── types/        profile.schema.ts — Zod schemas for the form and the API response
```

- The account sidebar / mobile menu is shared account chrome: `src/components/user/account-nav.tsx`,
  rendered by `src/app/(user)/(site)/account/layout.tsx`.
- `src/services/user/profile.service.ts` returns **dummy data** until the account API and
  authentication exist. Saving only validates on the client (see the TODO in the form).

See [docs/folder-structure.md](../../../../docs/folder-structure.md).
