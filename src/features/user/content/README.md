# Feature: `content` (user area)

**Scope:** Published website content from the backend's public content API.

**Routes:** `/pages/[slug]` — any page published in the backend (GET `/content/pages/{slug}`).
An unknown or unpublished slug shows the site's not-found page.

**Data:** `src/services/user/content.service.ts`

| Endpoint | Used by |
| --- | --- |
| `GET /content/home` | Published `pages` (sitemap, pre-rendered pages). Its `featured_yachts`, `banners` and `sections` are not shown yet: the home Featured Yachts carousel keeps its original design and data |
| `GET /content/pages/{slug}` | `/pages/[slug]` |
| `GET /content/faqs` | Home: FAQ section and its FAQPage structured data |
| `GET /content/banners` | Not shown yet (`listBanners`, `safeBannerLink` are ready for a future banner slot) |

Page bodies are plain text, rendered by `components/content-body.tsx` through React (escaped,
never as HTML). Answers are reused by the server for 60 seconds (signed image URLs last an hour).
See [docs/folder-structure.md](../../../../docs/folder-structure.md).
