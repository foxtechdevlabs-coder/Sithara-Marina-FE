import { fleetErrorMessage } from "@/features/admin/fleet/utils/fleet-error-message";
import { isApiError } from "@/services/http/api-error";
import type { ContentKind } from "@/services/admin/content.service";

/* Wording of the content screens. */

export const KIND_LABEL: Record<ContentKind, { one: string; many: string }> = {
  banners: { one: "Homepage banner", many: "Banners" },
  pages: { one: "Page", many: "Pages" },
  faqs: { one: "FAQ", many: "FAQs" },
};

export const isContentKind = (value: string): value is ContentKind =>
  value === "banners" || value === "pages" || value === "faqs";

/** "terms and conditions" → "terms-and-conditions" */
export const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{M}/gu, "") // accents split off by NFKD
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);

export const isSlug = (value: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);

/** A link the website can follow: a site path ("/yachts") or a full https address. */
export const isLink = (value: string) =>
  /^\/(?!\/)\S*$/.test(value) || /^https:\/\/\S+$/.test(value);

/** Banner links to a yacht: the slug follows. Alone, they mean "yacht not chosen yet". */
export const YACHT_LINK = "/yachts/";
export const YACHT_PLAN_LINK = "/plan-your-charter?yacht=";
export const needsYacht = (value: string) => value === YACHT_LINK || value === YACHT_PLAN_LINK;

/** Text split into paragraphs at blank lines (rendered as text, never HTML). */
export const paragraphs = (text: string) =>
  text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

/** The title split for the design's serif ending: the last three words. */
export function titleParts(title: string): [string, string] {
  const words = title.trim().split(/\s+/);
  if (words.length < 5) return [title.trim(), ""];
  return [words.slice(0, -3).join(" "), words.slice(-3).join(" ")];
}

/** A short message for a failed content request. */
export function contentErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    if (error.code === "SLUG_EXISTS")
      return "Another page already uses this web address. Choose a different one.";
    if (error.code === "INCOMPLETE_CONTENT")
      return "This can’t be published yet: a page needs body text, and a banner needs an image.";
    if (error.code === "INVALID_MEDIA") return "The image wasn’t accepted. Upload it again.";
    if (error.status === 403) return "Your account doesn’t have permission for website content.";
    if (error.status === 404) return "This item no longer exists.";
  }
  return fleetErrorMessage(error, "This content");
}
