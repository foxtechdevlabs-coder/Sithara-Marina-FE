# Feature: `enquiries` (user area)

**Scope:** A signed-in customer's enquiries and the proposals sent for them: accept or decline.

**Routes:** `/account/enquiries`, `/account/enquiries/[reference]`, `/account/proposals/[proposalId]`

**Notes:** Connected to `GET /me/enquiries`, `GET /me/enquiries/{ref}`, `GET /me/proposals/{id}`,
`POST /me/proposals/{id}/accept` and `/reject` (`src/services/user/enquiries.service.ts`). Accepting with
`next_step: "checkout"` opens the returned checkout session in the existing `/checkout` (bearer token, no
draft); when `price_changed` is true the review page says so, and the customer accepts today's total there.
