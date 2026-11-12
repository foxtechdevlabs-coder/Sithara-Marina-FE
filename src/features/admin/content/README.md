# Feature: `content` (admin area)

**Scope:** Customer-website content: homepage banners, pages (terms, policies, about…) and FAQs.

**Routes**

| Route                                     | Screen                                           |
| ----------------------------------------- | ------------------------------------------------ |
| `/admin/content?tab=banners\|pages\|faqs` | Content hub: list, status filter, "+ New …"      |
| `/admin/content/{kind}/new`               | A25 editor, "Words and images, considered."      |
| `/admin/content/{kind}/{itemId}`          | A25 editor for an existing item (type is locked) |
| `/admin/content/{kind}/{itemId}/preview`  | A43 preview, "Ready for your public view."       |

`{kind}` is `banners`, `pages` or `faqs`; any other value returns a 404.

**API** (`src/services/admin/content.service.ts`): `GET/POST /admin/{kind}`,
`PATCH/DELETE /admin/{kind}/{id}`. There is no single-item endpoint, so `findContent` reads
the list 100 items at a time. Banner images are uploaded with
`uploadBannerImage` in `media.service.ts` (purpose `banner_image`), and the returned
`media_id` is saved on the banner.

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
├── components/   content-list, content-editor (A25), content-preview (A43)
└── utils/        content-format: labels, slugify, link checks, error messages
```

Tests: `tests/integration/admin-content.test.ts`.
