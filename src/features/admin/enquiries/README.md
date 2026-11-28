# Feature: `enquiries` (admin area)

**Routes (admin Figma screen):**

| Route                                | Screen                                                                                                                 |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `/admin/enquiries`                   | A28 "Conversations into journeys." — inbox, counts, status / assignee                                                  |
| `/admin/enquiries/[id]`              | A29 "A journey in the making." — Enquiry (preferences, assignee, stage, proposal form) · Proposal (versions) · History |
| `/admin/enquiries/[id]/proposal?id=` | A44 "A proposal ready to share." — customer view, then send                                                            |

## Backend contract (`enquiries:read` / `enquiries:write`)

| Endpoint                               | Used by                                                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `GET /admin/enquiries`                 | Inbox (search, status / assignee, yacht, received from–to); the three counts (`status`, `limit=1` → `total`) |
| `GET /admin/enquiries/{id}`            | Detail with every proposal version and the history                                                           |
| `PATCH /admin/enquiries/{id}`          | Assigned concierge, stage (new / in progress / closed only)                                                  |
| `POST /admin/enquiries/{id}/proposals` | "Save proposal draft" when there is no draft (package or custom length)                                      |
| `GET /admin/proposals/{id}`            | In the service; the screens read versions from the enquiry detail                                            |
| `PATCH /admin/proposals/{id}`          | Saving the current draft                                                                                     |
| `POST /admin/proposals/{id}/publish`   | "Send this proposal"                                                                                         |
| `POST /admin/proposals/{id}/revise`    | A sent proposal → a new draft version                                                                        |
| `GET /admin/yachts/{id}/slot-types`    | The yacht's operating hours (`opens_at`–`closes_at`), which a proposal's length must fit in                  |

## Proposal workflow

Draft (edit with PATCH, send with publish) → Sent → the customer accepts (Converted, checkout
starts) or declines; it expires when its validity passes. A sent, declined or expired version is
revised into a new draft (the next version); the sent one is replaced once the new one is sent.
Accepted and replaced versions are final. Nothing can be drafted, saved, sent or revised while the
enquiry is closed. `proposalActions` in `utils/enquiry-format.ts` holds these rules.

**Charter length:** a new proposal is always a length of its own (`duration_minutes` ≥ 60, whole
hours and quarter hours) with `charter_amount`, the whole charter before GST, typed in rupees,
sent in paise and never worked out from an hourly rate (GST is added by the server). It must end
within the yacht's operating hours (`opens_at`–`closes_at`); the backend also checks the charter
hours. A new proposal is pre-filled from the enquiry: yacht, date, guests, and the customer's
requested duration and expected amount.

A draft or version made with a **package** stays a package: the form shows the package, keeps its
yacht, and PATCH sends no length at all, so the backend keeps the package and prices it from the
yacht's rates. Revising a sent package version gives a package draft. Only a super admin can switch
it to a custom length ("Use a custom length and price instead").

**Who can do what:** only a super admin creates, edits or revises a custom-length proposal (the
API's own check is `bookings:price_override`; see the backend report). Other staff see a custom
proposal read-only and can still review and send it; they can edit and revise package proposals.

**After acceptance:** the checkout session carries the agreed length (`slot.duration_minutes`). The
customer checkout shows it, keeps the guest count fixed, hides "Change dates", and when the
charter can't be priced it points to the concierge for a revised proposal instead of choosing
another time (`features/user/checkout`). The customer's proposal page shows "Custom charter" and
the duration, a message after declining, "Continue to checkout" for an accepted proposal, and
passes `price_changed` to checkout.

**Enquiry tab:** every field the customer sent is listed (`enquiryFacts`): expected amount, budget
and requested duration first, then date (and whether it's flexible), guests (adults and children),
yacht, destinations, occasion, requirements, message and any other `context` choice, plus contact
details and account. The enquiry API has no duration or amount fields, so the website sends them in
`context` (`duration_minutes`, `expected_amount_paise`), which the backend stores as sent. Form
logic and request bodies: `utils/proposal-form.ts`.

A new draft's id is kept as soon as it is created, so a second save before the page reloads
updates it instead of creating another.

## Notes

- Stages are worded as in the design: new → New, in_progress → Needs details, proposal_sent →
  Proposal ready, accepted → Converted. Only New, Needs details and Closed can be set by hand.
- A sent version can't be edited: "Revise" drafts the next version (the old one becomes
  superseded). A closed enquiry can't get a proposal until its stage is reopened.
- The enquiry's `slot_type` and `preferred_start_time` are no longer in the API and were removed.
- The design's "Internal note" has no API field; the proposal's `message` is shown to the
  customer, so the form labels it "Message to the customer".
- Proposal add-ons are supported by the API but were removed from the form on request; add-ons
  already on a proposal are kept (PATCH never sends `addons`) and shown in its price breakdown.
- `context` (the customer's search filters) is shown as "Key: value" preferences.
