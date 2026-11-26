import { describe, expect, it } from "vitest";

import { toShowcaseSlides } from "@/features/user/home/utils/spin-showcase";
import type { HomeSpinShowcase } from "@/services/user/content.service";
import type { YachtDetail } from "@/services/user/yachts.service";

const chosen = (slug: string, over: Partial<HomeSpinShowcase> = {}): HomeSpinShowcase => ({
  id: `id-${slug}`,
  name: `Yacht ${slug}`,
  slug,
  capacity: 12,
  frame_count: 36,
  poster_url: `https://cdn.test/${slug}/001.webp`,
  ...over,
});

const detail = (over: Partial<YachtDetail>) =>
  ({ length_ft: 150.9, suites: 6, card_tagline: null, description: null, ...over }) as YachtDetail;

describe("home page 360° carousel slides", () => {
  it("keeps the admin's order and the poster frame", () => {
    const slides = toShowcaseSlides([chosen("b"), chosen("a")], {});
    expect(slides.map((s) => s.slug)).toEqual(["b", "a"]);
    expect(slides[0]?.posterUrl).toBe("https://cdn.test/b/001.webp");
  });

  it("adds length, suites and text from the yacht's details", () => {
    const [slide] = toShowcaseSlides([chosen("astra-one")], {
      "astra-one": detail({ card_tagline: "Our flagship superyacht.", description: "Long text" }),
    });
    expect(slide?.specs).toEqual(["46 metres", "12 guests", "6 suites"]);
    expect(slide?.description).toBe("Our flagship superyacht.");
  });

  it("uses the description when there's no tagline, cut to fit the card", () => {
    const long = `${"word ".repeat(60)}end`;
    const [slide] = toShowcaseSlides([chosen("a")], { a: detail({ description: long }) });
    expect(slide?.description?.length).toBeLessThanOrEqual(160);
    expect(slide?.description?.endsWith("…")).toBe(true);
  });

  it("still shows guests when the details didn't load", () => {
    const [slide] = toShowcaseSlides([chosen("a", { poster_url: null })], { a: null });
    expect(slide).toMatchObject({ specs: ["12 guests"], description: null, posterUrl: null });
  });
});
