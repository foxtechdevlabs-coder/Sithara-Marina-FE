import { describe, expect, it } from "vitest";

import { buildUrl } from "@/services/http/build-url";

describe("buildUrl", () => {
  it("joins base and path with exactly one slash", () => {
    expect(buildUrl("http://api.test/api/", "/yachts")).toBe("http://api.test/api/yachts");
    expect(buildUrl("http://api.test/api", "yachts")).toBe("http://api.test/api/yachts");
  });

  it("appends query parameters and skips null/undefined", () => {
    expect(
      buildUrl("http://api.test", "/yachts", { page: 2, q: "sea view", x: undefined, y: null }),
    ).toBe("http://api.test/yachts?page=2&q=sea+view");
  });

  it("repeats array values", () => {
    expect(buildUrl("http://api.test", "/yachts", { tag: ["a", "b"] })).toBe(
      "http://api.test/yachts?tag=a&tag=b",
    );
  });

  it("omits the question mark when every value is empty", () => {
    expect(buildUrl("http://api.test", "/yachts", { a: undefined })).toBe("http://api.test/yachts");
  });
});
