import type { MetadataRoute } from "next";

import { SITE_URL } from "@/config/site";
import { listYachts } from "@/services/user/yachts.service";

/** Regenerated hourly, so new yachts appear without a deploy. */
export const revalidate = 3600;

/** The API's largest page size. */
const PAGE_SIZE = 100;

async function listYachtSlugs(): Promise<string[]> {
  const slugs: string[] = [];
  for (let page = 1; ; page++) {
    const { items, total } = await listYachts({ page, limit: PAGE_SIZE });
    slugs.push(...items.map((yacht) => yacht.slug));
    if (items.length === 0 || slugs.length >= total) return slugs;
  }
}

/** This runs during `next build`: an unreachable API must not fail the deploy. */
async function loadYachtSlugs(): Promise<string[]> {
  try {
    return await listYachtSlugs();
  } catch (error) {
    console.warn("Sitemap: yachts left out, the API could not be read.", error);
    return [];
  }
}

/**
 * Technical XML sitemap generator for all indexable public routes and dynamic yacht entries.
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

  const yachtEntries: MetadataRoute.Sitemap = (await loadYachtSlugs()).map((slug) => ({
    url: `${SITE_URL}/yachts/${encodeURIComponent(slug)}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticEntries, ...yachtEntries];
}
