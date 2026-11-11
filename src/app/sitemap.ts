import type { MetadataRoute } from "next";

import { SITE_URL } from "@/config/site";
import { userRoutes } from "@/constants/routes";
import { listYachts, type YachtCard } from "@/services/user/yachts.service";

/**
 * Regenerated at most once an hour, so a backend that was asleep or down when
 * the sitemap was last built does not leave yachts out until the next deploy.
 */
export const revalidate = 3600;

/** The backend's largest page size for GET /yachts. */
const PAGE_SIZE = 100;
/** A ceiling on pages read, so an unexpected `total` can never loop for long. */
const MAX_PAGES = 20;

/**
 * Every yacht the public catalogue lists. GET /yachts only returns active,
 * visible yachts, so nothing unpublished can appear here.
 */
async function loadPublishedYachts(): Promise<YachtCard[]> {
  const yachts: YachtCard[] = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { items, total } = await listYachts({ page, limit: PAGE_SIZE });
    yachts.push(...items);
    if (items.length === 0 || yachts.length >= total) break;
  }
  return yachts;
}

/**
 * Technical XML sitemap: the indexable public routes, plus one entry per
 * published yacht at its detail page (`/yachts/{slug}`). If the yacht catalogue
 * cannot be read, the static entries are still served; no yacht is invented.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/yachts`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/plan-your-charter`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  let yachts: YachtCard[] = [];
  try {
    yachts = await loadPublishedYachts();
  } catch {
    // Backend unavailable: serve the static entries rather than failing the sitemap.
    yachts = [];
  }

  const seen = new Set(staticEntries.map((entry) => entry.url));
  const yachtEntries: MetadataRoute.Sitemap = [];
  for (const yacht of yachts) {
    if (!yacht.slug) continue;
    const url = `${SITE_URL}${userRoutes.yacht(yacht.slug)}`;
    if (seen.has(url)) continue;
    seen.add(url);
    yachtEntries.push({ url, lastModified: now, changeFrequency: "weekly", priority: 0.8 });
  }

  return [...staticEntries, ...yachtEntries];
}
