import { yachtSpecs } from "@/features/user/yachts/utils/yacht-view";
import type { HomeSpinShowcase } from "@/services/user/content.service";
import type { YachtDetail } from "@/services/user/yachts.service";

/** One slide of the home page "Featured yacht." carousel. */
export interface ShowcaseSlide {
  id: string;
  slug: string;
  name: string;
  /** "46 metres", "12 guests", "6 suites": what is known. */
  specs: string[];
  /** The card's line of text; null when the yacht has none. */
  description: string | null;
  /** The first 360° frame, shown until the frames load; a one-hour link. */
  posterUrl: string | null;
}

/** The longest card text before it's cut, so the card keeps its size. */
const DESCRIPTION_MAX = 160;

const shorten = (text: string) => {
  const line = text.trim().replace(/\s+/g, " ");
  if (line.length <= DESCRIPTION_MAX) return line;
  return `${line.slice(0, DESCRIPTION_MAX - 1).replace(/\s+\S*$/, "")}…`;
};

/**
 * The carousel's slides: the yachts the admin chose (`spin_showcase` of GET
 * /content/home, in their order), with length, suites and text from GET
 * /yachts/{slug} where it loaded. Without it a slide still shows its guests.
 */
export function toShowcaseSlides(
  showcase: HomeSpinShowcase[],
  details: Record<string, YachtDetail | null>,
): ShowcaseSlide[] {
  return showcase.map((item) => {
    const detail = details[item.slug] ?? null;
    const text = detail?.card_tagline?.trim() || detail?.description?.trim() || "";
    return {
      id: item.id,
      slug: item.slug,
      name: item.name,
      specs: yachtSpecs({
        length_ft: detail?.length_ft ?? null,
        capacity: item.capacity,
        suites: detail?.suites ?? null,
      }),
      description: text ? shorten(text) : null,
      posterUrl: item.poster_url,
    };
  });
}
