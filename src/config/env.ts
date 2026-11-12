import { z } from "zod";

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.url({
    error: "NEXT_PUBLIC_API_URL must be an absolute URL. See .env.example.",
  }),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  /**
   * Google Identity Services OAuth client ID (public by design). Optional: without
   * it, "Sign in with Google" is simply not offered.
   */
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z
    .string()
    .regex(/^[\w-]+\.apps\.googleusercontent\.com$/, {
      error: "NEXT_PUBLIC_GOOGLE_CLIENT_ID must be a Google OAuth client ID. See .env.example.",
    })
    .optional(),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

/**
 * Validates raw values; throws a readable error listing every problem.
 *
 * `NEXT_PUBLIC_API_BASE_URL` is the variable's previous name. It is still
 * accepted as a fallback so existing deployments keep building; prefer
 * `NEXT_PUBLIC_API_URL`, the name the backend team uses.
 */
export function parsePublicEnv(source: Record<string, string | undefined>): PublicEnv {
  const result = publicEnvSchema.safeParse({
    NEXT_PUBLIC_API_URL: source.NEXT_PUBLIC_API_URL || source.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: source.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || undefined,
  });
  if (!result.success) {
    throw new Error(`Invalid public environment configuration:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

let cached: PublicEnv | undefined;

/**
 * Validated public (browser-safe) configuration, read on first use.
 *
 * Each variable must be referenced as a literal `process.env.NEXT_PUBLIC_*`
 * expression: Next.js inlines these at build time and cannot see dynamic
 * lookups. Production builds also validate these values up front (the root
 * layout is prerendered). Server-only secrets must never be added here — see
 * docs/api-integration.md.
 */
export function getPublicEnv(): PublicEnv {
  cached ??= parsePublicEnv({
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  });
  return cached;
}
