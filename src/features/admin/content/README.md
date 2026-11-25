# Feature: `content` (admin area)

**Scope:** Customer-website content: homepage banners, pages (terms, policies, about…), FAQs,
guest videos, and the home page 360° carousel.

**Routes**

| Route                                     | Screen                                           |
| ----------------------------------------- | ------------------------------------------------ |
| `/admin/content?tab=banners\|pages\|faqs` | Content hub: list, status filter, "+ New …"      |
| `/admin/content?tab=guest-videos`         | Guest videos tab: list, status filter, publish   |
| `/admin/content/guest-videos/new`         | New guest video                                  |
| `/admin/content/guest-videos/{videoId}`   | Edit a guest video                               |
| `/admin/content?tab=spin`                 | 360° Carousel tab: which yachts, in what order   |
| `/admin/content/{kind}/new`               | A25 editor, "Words and images, considered."      |
| `/admin/content/{kind}/{itemId}`          | A25 editor for an existing item (type is locked) |
| `/admin/content/{kind}/{itemId}/preview`  | A43 preview, "Ready for your public view."       |

`{kind}` is `banners`, `pages` or `faqs`; any other value returns a 404. The static
`guest-videos/…` routes take precedence over `[kind]`.

**API** (`src/services/admin/content.service.ts`): `GET/POST /admin/{kind}`,
`PATCH/DELETE /admin/{kind}/{id}`. There is no single-item endpoint, so `findContent` reads
the list 100 items at a time. Banner images are uploaded with
`uploadBannerImage` in `media.service.ts` (purpose `banner_image`), and the returned
`media_id` is saved on the banner.

**Guest videos tab** (`components/guest-video-list.tsx`, `guest-video-editor.tsx`,
`utils/guest-videos.ts`; `src/services/admin/guest-videos.service.ts`): `GET/POST /admin/guest-videos`,
`GET/PATCH/DELETE /admin/guest-videos/{id}`. The video is uploaded first with `uploadGuestVideo`
(purpose `guest_video`, MP4 or WebM up to 100 MB) and its `media_id` saved on the video. A new video
is a draft unless "Publish" is used, and publishing needs a video (`INCOMPLETE_CONTENT` otherwise).
PATCH sends only changed fields (`guestVideoPatch`); null clears description, location or the video,
and a new `media_id` replaces it (the backend deletes the old file). The list publishes, unpublishes
and deletes from each card. The website's Guests section (`features/user/home/components/guests-section.tsx`)
reads `GET /content/guest-videos` in the browser on every load (`cache: "no-store"`), because the
video links expire after an hour, and skips videos without a link.

**360° Carousel tab** (`components/spin-showcase-panel.tsx`, `utils/spin-showcase.ts`):
`GET` and `PUT /admin/content/spin-showcase`. The showcase is an ordered list of yachts, not one
yacht: `PUT { yacht_ids }` replaces it, in home page order, up to `max` (the
`home_spin_showcase_max` setting); an empty list clears it. Yachts to add come from
`GET /admin/yachts?status=active&visibility=visible&has_spin=true`, as the backend accepts only
those. The preview reuses the yacht page's `SpinViewer` (public frames, or the admin preview
frames for a yacht that isn't public). `INVALID_SHOWCASE` names each refused yacht and why.

**Rules the screens follow**

- A published page needs body text, and a published banner needs an image. The form checks
  this before saving, and the backend's `INCOMPLETE_CONTENT` error is shown if it slips through.
- A page's address is generated from its title until you edit it. `SLUG_EXISTS` is shown next to it.
- Banner links must be a site path (`/yachts`) or an `https://` URL.
- Body text is shown as plain paragraphs and is never rendered as HTML.
- After the first save of a new item, the address bar switches to the item's URL with
  `history.replaceState`, so the editor stays open and later saves update the same item.

```
content/
├── components/   content-list, content-editor (A25), content-preview (A43), spin-showcase-panel
└── utils/        content-format: labels, slugify, link checks, error messages; spin-showcase
```

Tests: `tests/integration/admin-content.test.ts`, `tests/integration/admin-spin-showcase.test.ts`,
`tests/integration/admin-guest-videos.test.ts`, `tests/unit/spin-showcase.test.ts`,
`tests/unit/guest-videos.test.ts`.
