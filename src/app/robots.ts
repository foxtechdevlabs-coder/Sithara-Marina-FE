import type { MetadataRoute } from "next";

import { SITE_URL } from "@/config/site";

/**
 * Technical crawler directive file conforming to Next.js App Router standards.
 * Allows legitimate search engines and Generative Engine bots (SearchGPT, Perplexity, etc.)
 * while blocking administrative, authentication, and checkout routes.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/*",
          "/checkout",
          "/checkout/*",
          "/login",
          "/register",
          "/account",
          "/account/*",
          "/*?*",
          "/*/availability",
        ],
      },
      {
        userAgent: [
          "Googlebot",
          "Bingbot",
          "Applebot",
          "GPTBot",
          "PerplexityBot",
          "ClaudeBot",
          "Google-Extended",
          "CCBot",
        ],
        allow: ["/", "/yachts", "/yachts/*", "/plan-your-charter"],
        disallow: [
          "/admin",
          "/admin/*",
          "/checkout",
          "/checkout/*",
          "/login",
          "/register",
          "/account",
          "/account/*",
          "/*/availability",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
