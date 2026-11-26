import type { Yacht } from "@/services/admin/fleet.service";
import type { SpinShowcase, SpinShowcaseItem } from "@/services/admin/content.service";
import { isApiError } from "@/services/http/api-error";

import { contentErrorMessage } from "./content-format";

/** A yacht in the carousel being edited: from the saved list, or just added. */
export interface ShowcaseEntry {
  id: string;
  name: string;
  slug: string;
  partner: string | null;
  previewUrl: string | null;
  /** As saved, with its status on the website; null for a yacht added since. */
  saved: SpinShowcaseItem | null;
}

export const entriesFromShowcase = (showcase: SpinShowcase): ShowcaseEntry[] =>
  showcase.items.map((item) => ({
    id: item.yacht.id,
    name: item.yacht.name,
    slug: item.yacht.slug,
    partner: item.yacht.partner?.name ?? null,
    previewUrl: item.preview_url,
    saved: item,
  }));

export const entryFromYacht = (
  y: Pick<Yacht, "id" | "name" | "slug" | "partner">,
): ShowcaseEntry => ({
  id: y.id,
  name: y.name,
  slug: y.slug,
  partner: y.partner?.name ?? null,
  previewUrl: null,
  saved: null,
});

/** Whether the list differs from what's saved, order included. */
export const showcaseChanged = (entries: ShowcaseEntry[], showcase: SpinShowcase) =>
  entries.length !== showcase.items.length ||
  entries.some((e, i) => e.id !== showcase.items[i]?.yacht.id);

/** The list with one entry moved up (-1) or down (+1); unchanged at either end. */
export function moveEntry<T>(list: T[], index: number, by: -1 | 1): T[] {
  const to = index + by;
  if (index < 0 || index >= list.length || to < 0 || to >= list.length) return list;
  const next = [...list];
  [next[index], next[to]] = [next[to]!, next[index]!];
  return next;
}

/** Whether a saved yacht is on the website, and if not, why. */
export function savedStatus(item: SpinShowcaseItem, max: number): string {
  if (item.shown_on_site) return "On the website";
  if (!item.is_active) return "Not shown · yacht inactive";
  if (!item.is_visible) return "Not shown · yacht hidden";
  if (!item.has_spin) return "Not shown · no 360° view";
  return `Not shown · beyond the limit of ${max}`;
}

const REASON: Record<string, string> = {
  unknown: "no longer exists",
  not_found: "no longer exists",
  inactive: "is inactive",
  hidden: "is hidden",
  no_spin: "has no 360° view",
};

/** A failed save. INVALID_SHOWCASE names each yacht the backend refused, and why. */
export function showcaseErrorMessage(error: unknown, names: Record<string, string>): string {
  if (isApiError(error) && error.code === "INVALID_SHOWCASE") {
    const details = (error.body as { details?: { max?: unknown; problems?: unknown } } | null)
      ?.details;
    const problems = Array.isArray(details?.problems)
      ? (details.problems as { yacht_id?: unknown; reason?: unknown }[])
      : [];
    const lines = problems.map((p) => {
      const name = (typeof p.yacht_id === "string" && names[p.yacht_id]) || "A yacht";
      const reason = typeof p.reason === "string" ? p.reason : "";
      return `${name} ${REASON[reason] ?? (reason.replace(/_/g, " ") || "can’t be shown")}.`;
    });
    if (lines.length) return `This list can’t be saved: ${lines.join(" ")}`;
    if (typeof details?.max === "number") {
      return `The carousel takes at most ${details.max} yachts. Remove some, then save.`;
    }
  }
  return contentErrorMessage(error);
}
