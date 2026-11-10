import { describe, expect, it } from "vitest";

import {
  enquiryStateLabel,
  isEmail,
  latestActivityText,
  looksLikeBookingReference,
  normalisePhone,
} from "@/features/admin/customers/utils/customer-format";

describe("customer formats", () => {
  it("normalises phones to E.164", () => {
    expect(normalisePhone("+91 98765 43210")).toBe("+919876543210");
    expect(normalisePhone("+1 (415) 555-0100")).toBe("+14155550100");
    expect(normalisePhone("")).toBe("");
    expect(normalisePhone("   ")).toBe("");
    expect(normalisePhone("98765 43210")).toBeNull();
    expect(normalisePhone("+0123456789")).toBeNull();
  });

  it("words the latest activity like the design", () => {
    expect(latestActivityText({ reference: "SM-1048", status: "confirmed" })).toBe(
      "SM-1048 · Confirmed",
    );
    expect(latestActivityText({ reference: "SM-1", status: "pending_payment" })).toBe(
      "SM-1 · Payment pending",
    );
    expect(latestActivityText({ reference: "SM-2", status: "completed" })).toBe(
      "SM-2 · Charter completed",
    );
    expect(enquiryStateLabel("proposal_sent")).toBe("Proposal ready");
  });

  it("recognises emails and booking references", () => {
    expect(isEmail("a@b.co")).toBe(true);
    expect(isEmail("a@b")).toBe(false);
    expect(looksLikeBookingReference("sm-2026-0042")).toBe(true);
    expect(looksLikeBookingReference("Smith")).toBe(false);
  });
});
