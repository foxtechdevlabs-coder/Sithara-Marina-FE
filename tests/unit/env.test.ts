import { describe, expect, it } from "vitest";

import { parsePublicEnv } from "@/config/env";

describe("parsePublicEnv", () => {
  it("accepts an absolute API URL", () => {
    expect(parsePublicEnv({ NEXT_PUBLIC_API_URL: "http://localhost:3000" })).toEqual({
      NEXT_PUBLIC_API_URL: "http://localhost:3000",
    });
  });

  it("falls back to the previous variable name", () => {
    expect(parsePublicEnv({ NEXT_PUBLIC_API_BASE_URL: "https://api.example.com" })).toEqual({
      NEXT_PUBLIC_API_URL: "https://api.example.com",
    });
  });

  it("prefers NEXT_PUBLIC_API_URL when both are set", () => {
    expect(
      parsePublicEnv({
        NEXT_PUBLIC_API_URL: "https://api.example.com",
        NEXT_PUBLIC_API_BASE_URL: "http://localhost:4000/api",
      }),
    ).toEqual({ NEXT_PUBLIC_API_URL: "https://api.example.com" });
  });

  it("fails clearly when the API URL is missing", () => {
    expect(() => parsePublicEnv({})).toThrow(/NEXT_PUBLIC_API_URL must be an absolute URL/);
  });

  it("rejects a relative API URL", () => {
    expect(() => parsePublicEnv({ NEXT_PUBLIC_API_URL: "/api" })).toThrow(/NEXT_PUBLIC_API_URL/);
  });
});
