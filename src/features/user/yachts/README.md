# Feature: `yachts` (user area)

**Scope:** Yacht listing, filtering and detail views: description, gallery, crew, amenities, policies.

**Routes:** `/yachts`, `/yachts/[yachtId]`

**Notes:** Connected to the backend through `src/services/user/yachts.service.ts`. `[yachtId]` is the yacht's slug. See [docs/api-integration.md](../../../../docs/api-integration.md#yacht-catalogue).

Add only the folders you need:

```
yachts/
├── components/   UI used only by this feature
├── hooks/        React hooks for this feature
├── types/        Types for this feature's data
└── utils/        Pure helpers for this feature
```

API calls for this feature belong in `src/services/user/yachts.service.ts`, which uses
`src/services/http/api-client.ts`. Route files in `src/app` stay thin and render components
from this folder.
See [docs/folder-structure.md](../../../../docs/folder-structure.md).

## 360° view

- Details page: "View in 360°" appears on the right side of the yacht hero image only when
  `GET /yachts/{slug}` says `has_spin`. It opens a full-screen interactive view where visitors drag
  horizontally to explore the yacht in 360°. When opened, the yacht remains stationary and displays
  a subtle mouse movement animation with guidance until interaction begins. Frames start loading
  when the visitor hovers over, focuses or touches the button.
- Homepage featured carousel: the active slide asks `GET /yachts/{slug}/spin` once. If there's a
  view it replaces the photo once ready, and visitors drag it to turn. A 404 keeps the photo, and
  that yacht isn't asked again this visit.
- Loading (`utils/spin-preload.ts`, `src/lib/spin-frames.ts`): one request for the frame links
  (`size=small` at 767px wide or less, otherwise `large`). Every frame is downloaded and decoded
  into memory, then drawn on a canvas, so turning makes no requests. Failed frames are retried, and
  expired signed links are fetched again once. Frames are freed when the page or slide closes.
