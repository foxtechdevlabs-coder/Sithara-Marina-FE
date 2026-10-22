import { describe, expect, it } from "vitest";

import { emailSchema } from "@/validation/email";

describe("emailSchema", () => {
  it("trims and lower-cases a valid address", () => {
    expect(emailSchema.parse("  Guest@Example.COM ")).toBe("guest@example.com");
  });

  it("rejects an invalid address with a readable message", () => {
    const result = emailSchema.safeParse("not-an-email");
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Enter a valid email address.");
  });
});
