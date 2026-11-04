import { describe, expect, it } from "vitest";

import { safeNextPath } from "@/features/user/auth/session";

const BACKSLASH = String.fromCharCode(92);

describe("safeNextPath (post-login redirect)", () => {
  it("accepts same-site relative paths", () => {
    expect(safeNextPath("/yachts/astra-one?date=2026-12-01")).toBe(
      "/yachts/astra-one?date=2026-12-01",
    );
  });

  it("rejects external, protocol-relative and missing targets (open redirect)", () => {
    const unsafe = [
      "https://evil.example",
      "//evil.example",
      `/${BACKSLASH}evil.example`, // browsers treat "/\" like "//"
      "javascript:alert(1)",
      "",
      null,
      undefined,
    ];
    for (const value of unsafe) expect(safeNextPath(value)).toBeNull();
  });
});
