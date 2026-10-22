import { describe, expect, it } from "vitest";

import { parsePublicEnv } from "@/config/env";

describe("parsePublicEnv", () => {
  it("accepts an absolute API URL", () => {
    expect(parsePublicEnv({ NEXT_PUBLIC_API_BASE_URL: "http://localhost:4000/api" })).toEqual({
      NEXT_PUBLIC_API_BASE_URL: "http://localhost:4000/api",
    });
  });

  it("fails clearly when the API URL is missing", () => {
    expect(() => parsePublicEnv({})).toThrow(/NEXT_PUBLIC_API_BASE_URL must be an absolute URL/);
  });

  it("rejects a relative API URL", () => {
    expect(() => parsePublicEnv({ NEXT_PUBLIC_API_BASE_URL: "/api" })).toThrow(
      /NEXT_PUBLIC_API_BASE_URL/,
    );
  });
});
