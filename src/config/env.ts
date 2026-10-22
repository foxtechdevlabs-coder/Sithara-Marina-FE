import { z } from "zod";

export const publicEnvSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.url({
    error: "NEXT_PUBLIC_API_BASE_URL must be an absolute URL. See .env.example.",
  }),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

/** Validates raw values; throws a readable error listing every problem. */
export function parsePublicEnv(source: Record<string, string | undefined>): PublicEnv {
  const result = publicEnvSchema.safeParse(source);
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
 * lookups. Production builds also validate these values up front in
 * next.config.ts. Server-only secrets must never be added here — see
 * docs/api-integration.md.
 */
export function getPublicEnv(): PublicEnv {
  cached ??= parsePublicEnv({
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  });
  return cached;
}
