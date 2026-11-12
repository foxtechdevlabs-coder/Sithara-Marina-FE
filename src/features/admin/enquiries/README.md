# Feature: `enquiries` (admin area)

**Routes (admin Figma screen):**

| Route                                | Screen                                                                                                                 |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `/admin/enquiries`                   | A28 "Conversations into journeys." — inbox, counts, status / assignee                                                  |
| `/admin/enquiries/[id]`              | A29 "A journey in the making." — Enquiry (preferences, assignee, stage, proposal form) · Proposal (versions) · History |
| `/admin/enquiries/[id]/proposal?id=` | A44 "A proposal ready to share." — customer view, then send                                                            |

## Backend contract (`enquiries:read` / `enquiries:write`)

| Endpoint                               | Used by                                                     |
| -------------------------------------- | ----------------------------------------------------------- |
| `GET /admin/enquiries`                 | Inbox; the three counts (`status`, `limit=1` → `total`)     |
| `GET /admin/enquiries/{id}`            | Detail with every proposal version and the history          |
| `PATCH /admin/enquiries/{id}`          | Assigned concierge, stage (new / in progress / closed only) |
| `POST /admin/enquiries/{id}/proposals` | "Save proposal draft" when there is no draft                |
| `PATCH /admin/proposals/{id}`          | Saving the current draft                                    |
| `POST /admin/proposals/{id}/publish`   | "Send this proposal"                                        |
| `POST /admin/proposals/{id}/revise`    | A sent proposal → a new draft version                       |
| `POST /pricing/quote`                  | The live "Total proposal amount" before saving              |
| `GET /admin/yachts/{id}/slot-types`    | The yacht's packages and suggested start times              |

## Notes

- Stages are worded as in the design: new → New, in_progress → Needs details, proposal_sent →
  Proposal ready, accepted → Converted. Only New, Needs details and Closed can be set by hand.
- A sent version can't be edited: "Revise" drafts the next version (the old one becomes
  superseded). A closed enquiry can't get a proposal until its stage is reopened.
- The design's "Internal note" has no API field; the proposal's `message` is shown to the
  customer, so the form labels it "Message to the customer".
- Proposal add-ons are supported by the API but not in the design, so the form doesn't offer them.
- `context` (the customer's search filters) is shown as "Key: value" preferences.
