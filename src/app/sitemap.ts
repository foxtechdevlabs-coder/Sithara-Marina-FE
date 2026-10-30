import type { MetadataRoute } from "next";

import { dummyFleet } from "@/components/user/OurYachts";
import { SITE_URL } from "@/config/site";

/**
 * Technical XML sitemap generator for all indexable public routes and dynamic yacht entries.
 */
export default function sitemap(): MetadataRoute.Sitemap {
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

  const yachtEntries: MetadataRoute.Sitemap = dummyFleet.map((yacht) => ({
    url: `${SITE_URL}/yachts/${yacht.id}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticEntries, ...yachtEntries];
}
