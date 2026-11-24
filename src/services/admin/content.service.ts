import { z } from "zod";

import { adminApiClient } from "./admin-api-client";

/*
 * Website content (backend: /admin/pages, /admin/faqs, /admin/banners; needs
 * cms:read / cms:write / cms:delete). There is no single-item endpoint, so an
 * item is found in its list. Bodies are plain text here and rendered as text,
 * never as HTML.
 */

export const pageSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  summary: z.string().nullable(),
  body: z.string(),
  is_published: z.boolean(),
  published_at: z.string().nullable(),
  show_on_home: z.boolean(),
  sort_order: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ContentPage = z.infer<typeof pageSchema>;

export const faqSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
  category: z.string().nullable(),
  is_published: z.boolean(),
  sort_order: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Faq = z.infer<typeof faqSchema>;

export const bannerSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string().nullable(),
  media_id: z.string().nullable(),
  image_url: z.string().nullable(),
  link_url: z.string().nullable(),
  is_published: z.boolean(),
  sort_order: z.number(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Banner = z.infer<typeof bannerSchema>;

export const CONTENT_KINDS = ["banners", "pages", "faqs"] as const;
export type ContentKind = (typeof CONTENT_KINDS)[number];

export type ContentItem<K extends ContentKind> = K extends "banners"
  ? Banner
  : K extends "pages"
    ? ContentPage
    : Faq;

const SCHEMAS = { banners: bannerSchema, pages: pageSchema, faqs: faqSchema } as const;

/** The schema of one kind, typed as that kind's item. */
const schemaOf = <K extends ContentKind>(kind: K) =>
  SCHEMAS[kind] as unknown as z.ZodType<ContentItem<K>>;

export interface PageInput {
  slug: string;
  title: string;
  summary?: string | null;
  /** May be empty until published (400 INCOMPLETE_CONTENT otherwise). */
  body?: string;
  is_published?: boolean;
  show_on_home?: boolean;
  sort_order?: number;
}
export interface FaqInput {
  question: string;
  answer: string;
  category?: string | null;
  is_published?: boolean;
  sort_order?: number;
}
export interface BannerInput {
  title: string;
  subtitle?: string | null;
  /** From POST /admin/media/uploads (purpose banner_image). A published banner needs one. */
  media_id?: string | null;
  link_url?: string | null;
  is_published?: boolean;
  sort_order?: number;
}

export type ContentInput<K extends ContentKind> = K extends "banners"
  ? BannerInput
  : K extends "pages"
    ? PageInput
    : FaqInput;

const listSchema = <T extends z.ZodType>(item: T) =>
  z.object({ items: z.array(item), total: z.number(), page: z.number(), limit: z.number() });

/** GET /admin/{kind} */
export function listContent<K extends ContentKind>(
  kind: K,
  query: { page?: number; limit?: number; status?: "published" | "draft" } = {},
  signal?: AbortSignal,
) {
  return adminApiClient.get(`/admin/${kind}`, {
    query: { ...query },
    schema: listSchema(schemaOf(kind)),
    signal,
  }) as Promise<{ items: ContentItem<K>[]; total: number; page: number; limit: number }>;
}

/** The item with this id (read through its list, 100 a page); null when it no longer exists. */
export async function findContent<K extends ContentKind>(
  kind: K,
  id: string,
  signal?: AbortSignal,
) {
  for (let page = 1; page <= 20; page++) {
    const list = await listContent(kind, { page, limit: 100 }, signal);
    const found = list.items.find((x) => x.id === id);
    if (found) return found;
    if (!list.items.length || page * list.limit >= list.total) break;
  }
  return null;
}

/** POST /admin/{kind} (201). Pages: 409 SLUG_EXISTS. */
export function createContent<K extends ContentKind>(kind: K, input: ContentInput<K>) {
  return adminApiClient.post(`/admin/${kind}`, { body: input, schema: schemaOf(kind) }) as Promise<
    ContentItem<K>
  >;
}

/** PATCH /admin/{kind}/{id} — changed fields only. */
export function updateContent<K extends ContentKind>(
  kind: K,
  id: string,
  patch: Partial<ContentInput<K>>,
) {
  return adminApiClient.patch(`/admin/${kind}/${encodeURIComponent(id)}`, {
    body: patch,
    schema: schemaOf(kind),
  }) as Promise<ContentItem<K>>;
}

/** DELETE /admin/{kind}/{id} (204) */
export async function deleteContent(kind: ContentKind, id: string): Promise<void> {
  await adminApiClient.delete(`/admin/${kind}/${encodeURIComponent(id)}`);
}

/* 360° showcase -------------------------------------------------------- */

/** SpinShowcaseItemDto: a yacht in the home page's 360° carousel. */
export const spinShowcaseItemSchema = z.object({
  yacht: z.object({
    id: z.string(),
    name: z.string(),
    slug: z.string(),
    partner: z.object({ id: z.string(), name: z.string() }).nullable(),
  }),
  is_active: z.boolean(),
  is_visible: z.boolean(),
  /** Has a completed 360° view. */
  has_spin: z.boolean(),
  /** The website shows it now: active, visible, with a 360° view, and within `max`. */
  shown_on_site: z.boolean(),
  /** The first small frame, for the admin list. */
  preview_url: z.string().nullable(),
});
export type SpinShowcaseItem = z.infer<typeof spinShowcaseItemSchema>;

/** SpinShowcaseResponseDto */
export const spinShowcaseSchema = z.object({
  /** In saved order: the home page order. */
  items: z.array(spinShowcaseItemSchema),
  /** The `home_spin_showcase_max` setting: the most yachts the carousel takes. */
  max: z.number(),
  /** Last save; null if never saved. */
  updated_at: z.string().nullable(),
  updated_by: z.object({ id: z.string(), full_name: z.string() }).nullable(),
});
export type SpinShowcase = z.infer<typeof spinShowcaseSchema>;

/** GET /admin/content/spin-showcase */
export function getSpinShowcase(signal?: AbortSignal): Promise<SpinShowcase> {
  return adminApiClient.get("/admin/content/spin-showcase", { schema: spinShowcaseSchema, signal });
}

/**
 * PUT /admin/content/spin-showcase — replaces the list, in home page order. Each
 * yacht must be active, visible and have a completed 360° view; at most `max`.
 * An empty list clears the showcase. 400 INVALID_SHOWCASE otherwise.
 */
export function updateSpinShowcase(yachtIds: string[]): Promise<SpinShowcase> {
  return adminApiClient.put("/admin/content/spin-showcase", {
    body: { yacht_ids: yachtIds },
    schema: spinShowcaseSchema,
  });
}
