import { z } from "zod";

import { apiClient } from "@/services/http/api-client";

/*
 * Public website content (pages, FAQs, banners and the home page's picks).
 * Contract: the backend's Swagger docs at `<NEXT_PUBLIC_API_URL>/docs`. Every
 * call is a public GET; only published content is returned.
 *
 * Money is in minor units (paise), excluding GST. Image URLs are signed and stay
 * valid for an hour, so answers are reused for at most a minute (server only).
 */

/** The hosted backend can take ~40 s to wake from idle (Render). */
const PUBLIC = { auth: false, timeoutMs: 60_000 } as const;

/** Seconds the Next.js server may reuse a content answer; ignored in the browser. */
export const CONTENT_REVALIDATE_SECONDS = 60;
const CACHED = { init: { next: { revalidate: CONTENT_REVALIDATE_SECONDS } } } as const;

export type ContentErrorCode = "NOT_FOUND";

// ── Shared ──────────────────────────────────────────────────────────────────

const bannerSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string().nullable(),
  image_url: z.string().nullable(),
  link_url: z.string().nullable(),
});
export type ContentBanner = z.infer<typeof bannerSchema>;

const pagedSchema = <T extends z.ZodType>(item: T) =>
  z.object({ items: z.array(item), total: z.number(), page: z.number(), limit: z.number() });

export interface PageParams {
  /** From 1. */
  page?: number;
  /** 1 to 100 (backend default 20). */
  limit?: number;
}

// ── Home ────────────────────────────────────────────────────────────────────

const featuredYachtSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  /** Maximum guests. */
  capacity: z.number(),
  image_url: z.string().nullable(),
  /** Lowest active base price, paise, excluding GST. */
  starting_price: z.number().nullable(),
});
export type FeaturedYacht = z.infer<typeof featuredYachtSchema>;

const homeSectionSchema = z.object({
  slug: z.string(),
  title: z.string(),
  summary: z.string().nullable(),
});
export type HomeSection = z.infer<typeof homeSectionSchema>;

const pageLinkSchema = z.object({ slug: z.string(), title: z.string() });
export type ContentPageLink = z.infer<typeof pageLinkSchema>;

const homeContentSchema = z.object({
  featured_yachts: z.array(featuredYachtSchema),
  banners: z.array(bannerSchema),
  sections: z.array(homeSectionSchema),
  /** Every published content page. */
  pages: z.array(pageLinkSchema),
});
export type HomeContent = z.infer<typeof homeContentSchema>;

/** GET /content/home: the home page's featured yachts, banners, sections and published pages. */
export function getHomeContent(signal?: AbortSignal): Promise<HomeContent> {
  return apiClient.get("/content/home", { ...PUBLIC, ...CACHED, signal, schema: homeContentSchema });
}

// ── Pages ───────────────────────────────────────────────────────────────────

const contentPageSchema = z.object({
  slug: z.string(),
  title: z.string(),
  summary: z.string().nullable(),
  /** Plain text from the backend; never rendered as HTML (see ContentBody). */
  body: z.string(),
  updated_at: z.string(),
});
export type ContentPage = z.infer<typeof contentPageSchema>;

/** GET /content/pages/{slug}. 404: no published page with this slug. */
export function getContentPage(slug: string, signal?: AbortSignal): Promise<ContentPage> {
  return apiClient.get(`/content/pages/${encodeURIComponent(slug)}`, {
    ...PUBLIC,
    ...CACHED,
    signal,
    schema: contentPageSchema,
  });
}

// ── FAQs ────────────────────────────────────────────────────────────────────

const faqSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
  category: z.string().nullable(),
});
export type Faq = z.infer<typeof faqSchema>;

const faqListSchema = pagedSchema(faqSchema);
export type FaqList = z.infer<typeof faqListSchema>;

/** GET /content/faqs: one page of published FAQs, in the backend's order. */
export function listFaqs(params: PageParams = {}, signal?: AbortSignal): Promise<FaqList> {
  return apiClient.get("/content/faqs", {
    ...PUBLIC,
    ...CACHED,
    query: { ...params },
    signal,
    schema: faqListSchema,
  });
}

/** Pages read at most, so an unexpected `total` can never loop for long. */
const MAX_FAQ_PAGES = 10;

/** Every published FAQ, page by page (20 per request, as the backend defaults). */
export async function listAllFaqs(signal?: AbortSignal): Promise<Faq[]> {
  const faqs: Faq[] = [];
  for (let page = 1; page <= MAX_FAQ_PAGES; page++) {
    const { items, total } = await listFaqs({ page, limit: 20 }, signal);
    faqs.push(...items);
    if (items.length === 0 || faqs.length >= total) break;
  }
  return faqs;
}

// ── Banners ─────────────────────────────────────────────────────────────────

const bannerListSchema = pagedSchema(bannerSchema);
export type BannerList = z.infer<typeof bannerListSchema>;

/**
 * GET /content/banners: one page of published banners. Not shown anywhere yet:
 * ready for when a place for banners is designed.
 */
export function listBanners(params: PageParams = {}, signal?: AbortSignal): Promise<BannerList> {
  return apiClient.get("/content/banners", {
    ...PUBLIC,
    ...CACHED,
    query: { ...params },
    signal,
    schema: bannerListSchema,
  });
}

/**
 * A banner's `link_url`, when it is one the site can open: a same-site path
 * ("/yachts") or an http(s) address. Anything else (e.g. `javascript:`) is null.
 */
export function safeBannerLink(linkUrl: string | null): string | null {
  const value = linkUrl?.trim();
  if (!value) return null;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}
