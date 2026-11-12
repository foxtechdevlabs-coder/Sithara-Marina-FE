import { describe, expect, it } from "vitest";

import {
  checkoutErrorMessage,
  codeMessage,
} from "@/features/user/checkout/utils/checkout-error-message";
import { contactSchema, guestContactSchema } from "@/features/user/checkout/utils/contact-schema";
import {
  addMinutesToLocalTime,
  formatClockTime,
  formatDuration,
} from "@/features/user/yachts/utils/yacht-view";
import { ApiError } from "@/services/http/api-error";

const CONTACT = { full_name: "Asha Menon", phone: "+91 98765-43210", special_requests: "" };

describe("contact details", () => {
  it("normalises the phone to E.164", () => {
    expect(contactSchema.parse(CONTACT).phone).toBe("+919876543210");
  });

  it.each(["9876543210", "+0123456789", "+91", "not a phone"])("rejects %s", (phone) => {
    expect(contactSchema.safeParse({ ...CONTACT, phone }).success).toBe(false);
  });

  it("needs an email from a guest only", () => {
    expect(contactSchema.safeParse(CONTACT).success).toBe(true);
    expect(guestContactSchema.safeParse(CONTACT).success).toBe(false);
    expect(guestContactSchema.safeParse({ ...CONTACT, email: "a@example.com" }).success).toBe(true);
  });
});

describe("checkoutErrorMessage", () => {
  const backend = (status: number, code?: string, message = "internal detail") =>
    new ApiError("x", { kind: "http", status, body: { statusCode: status, code, message } });

  it("explains each documented code", () => {
    for (const code of [
      "INVALID_SLOT_TYPE",
      "INVALID_ADDON",
      "GUESTS_EXCEED_CAPACITY",
      "YACHT_NOT_FOUND",
      "SLOT_NOT_AVAILABLE",
      "PRICE_NOT_AVAILABLE",
      "GST_NOT_CONFIGURED",
      "HOLD_EXPIRED",
      "RESEND_COOLDOWN",
      "TOO_MANY_EMAILS",
      "EMAIL_DELIVERY_FAILED",
      "SERVICE_UNAVAILABLE",
    ]) {
      expect(codeMessage(code)).toBeTruthy();
      expect(checkoutErrorMessage(backend(409, code), "fallback")).toBe(codeMessage(code));
    }
  });

  it("never shows a raw server message", () => {
    for (const status of [400, 401, 403, 404, 500]) {
      expect(checkoutErrorMessage(backend(status), "fallback")).not.toContain("internal detail");
    }
  });
});

describe("time helpers", () => {
  it("formats local times without shifting them", () => {
    expect(formatClockTime("09:00").toLowerCase()).toContain("9:00");
    expect(formatClockTime("13:30").toLowerCase()).toContain("1:30");
  });

  it.each([
    [60, "2026-11-10", "15:46"],
    [120, "2026-11-10", "16:46"],
    [180, "2026-11-10", "17:46"],
  ])("adds %i minutes to 2:46 pm", (minutes, date, time) => {
    expect(addMinutesToLocalTime("2026-11-10", "14:46", minutes)).toEqual({ date, time });
  });

  it("rolls over midnight, month end and year end", () => {
    expect(addMinutesToLocalTime("2026-11-10", "23:00", 120)).toEqual({
      date: "2026-11-11",
      time: "01:00",
    });
    expect(addMinutesToLocalTime("2026-11-30", "23:30", 60)).toEqual({
      date: "2026-12-01",
      time: "00:30",
    });
    expect(addMinutesToLocalTime("2026-12-31", "22:00", 180)).toEqual({
      date: "2027-01-01",
      time: "01:00",
    });
  });

  it("formats durations", () => {
    expect(formatDuration(240)).toBe("4 hours");
    expect(formatDuration(60)).toBe("1 hour");
    expect(formatDuration(90)).toBe("1 hr 30 min");
    expect(formatDuration(45)).toBe("45 min");
  });
});
