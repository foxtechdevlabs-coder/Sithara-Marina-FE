import { describe, expect, it } from "vitest";

import { cx } from "@/lib/cx";

describe("cx", () => {
  it("joins truthy class names and skips falsy ones", () => {
    expect(cx("a", false, undefined, "b", null, "")).toBe("a b");
  });
});
