import { describe, expect, it } from "vitest";

import { isContentTab, TAB_LABEL } from "@/features/admin/content/utils/content-format";
import {
  entriesFromShowcase,
  entryFromYacht,
  moveEntry,
  savedStatus,
  showcaseChanged,
  showcaseErrorMessage,
} from "@/features/admin/content/utils/spin-showcase";
import type { SpinShowcase, SpinShowcaseItem } from "@/services/admin/content.service";
import { ApiError } from "@/services/http/api-error";

const item = (id: string, over: Partial<SpinShowcaseItem> = {}): SpinShowcaseItem => ({
  yacht: { id, name: `Yacht ${id}`, slug: `yacht-${id}`, partner: null },
  is_active: true,
  is_visible: true,
  has_spin: true,
  shown_on_site: true,
  preview_url: `https://cdn.test/${id}.jpg`,
  ...over,
});
const showcase: SpinShowcase = {
  items: [item("a"), item("b")],
  max: 3,
  updated_at: "2026-11-20T10:00:00.000Z",
  updated_by: { id: "s-1", full_name: "Anjali K." },
};

describe("360° carousel tab", () => {
  it("is the fourth tab of the Content page", () => {
    expect(TAB_LABEL.spin).toBe("360° Carousel");
    expect(isContentTab("spin")).toBe(true);
    expect(isContentTab("banners")).toBe(true);
    expect(isContentTab("other")).toBe(false);
  });

  it("tells a changed list, order included", () => {
    const entries = entriesFromShowcase(showcase);
    expect(showcaseChanged(entries, showcase)).toBe(false);
    expect(showcaseChanged(moveEntry(entries, 0, 1), showcase)).toBe(true);
    expect(showcaseChanged(entries.slice(1), showcase)).toBe(true);
    expect(
      showcaseChanged(
        [...entries, entryFromYacht({ id: "c", name: "C", slug: "c", partner: null })],
        showcase,
      ),
    ).toBe(true);
  });

  it("moves an entry, and leaves the ends alone", () => {
    expect(moveEntry(["a", "b", "c"], 2, -1)).toEqual(["a", "c", "b"]);
    expect(moveEntry(["a", "b"], 0, -1)).toEqual(["a", "b"]);
    expect(moveEntry(["a", "b"], 1, 1)).toEqual(["a", "b"]);
  });

  it("says why a saved yacht isn't shown", () => {
    expect(savedStatus(item("a"), 3)).toBe("On the website");
    expect(savedStatus(item("a", { shown_on_site: false, is_visible: false }), 3)).toMatch(
      /hidden/,
    );
    expect(savedStatus(item("a", { shown_on_site: false, has_spin: false }), 3)).toMatch(/360/);
    expect(savedStatus(item("a", { shown_on_site: false }), 3)).toMatch(/limit of 3/);
  });

  it("names the yachts the backend refused", () => {
    const refused = new ApiError("Bad", {
      kind: "http",
      status: 400,
      body: {
        code: "INVALID_SHOWCASE",
        details: { problems: [{ yacht_id: "a", reason: "hidden" }] },
      },
    });
    expect(showcaseErrorMessage(refused, { a: "Astra One" })).toBe(
      "This list can’t be saved: Astra One is hidden.",
    );
    const tooMany = new ApiError("Bad", {
      kind: "http",
      status: 400,
      body: { code: "INVALID_SHOWCASE", details: { max: 5 } },
    });
    expect(showcaseErrorMessage(tooMany, {})).toMatch(/at most 5 yachts/);
  });
});
