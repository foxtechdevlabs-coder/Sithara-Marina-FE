export type ClassValue = string | false | null | undefined;

/**
 * Joins class names, skipping falsy values.
 *
 * Intentionally minimal: it does not resolve conflicting Tailwind classes.
 * Introduce `tailwind-merge` only if conflicting overrides become a real need.
 */
export function cx(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(" ");
}
