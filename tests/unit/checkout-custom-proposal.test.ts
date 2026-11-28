import { describe, expect, it } from "vitest";

import { charterFromSession } from "@/features/user/checkout/components/review-pay";
import type { CheckoutSession } from "@/services/user/checkout.service";

// An accepted custom proposal opens a checkout whose slot carries its own length
// (CheckoutSlotDto.duration_minutes) and no package.
const session = (
  duration_minutes: number | null,
  slot_type_id: string | null,
): CheckoutSession => ({
  id: "cs-1",
  expires_at: "2026-12-01T00:00:00.000Z",
  yacht: { id: "y-1", slug: "astra-one", name: "Astra One" },
  slot: {
    slot_type_id,
    slot_type_name: slot_type_id ? "Sunset" : null,
    duration_minutes,
    date: "2026-12-20",
    start_time: "16:00",
    end_time: null,
  },
  guests: 8,
  addons: [],
  contact: {
    full_name: "Ananya Rao",
    email: "a@example.com",
    phone: "+919800000000",
    special_requests: null,
  },
  pricing: null,
  pricing_problem: null,
  totals: null,
});

describe("checkout for an accepted custom proposal", () => {
  it("shows the agreed length and return time from the session", () => {
    const charter = charterFromSession(session(330, null));
    expect(charter.durationMinutes).toBe(330);
    expect(charter.endTime).toBe("21:30");
    expect(charter.packageName).toBeNull();
    expect(charter.guests).toBe(8);
  });

  it("never shows a custom proposal as a package, even if the backend names it", () => {
    const named = session(330, null);
    named.slot.slot_type_name = "Custom";
    expect(charterFromSession(named).packageName).toBeNull();
  });

  it("still takes a package's length from the yacht", () => {
    const charter = charterFromSession(session(null, "s-1"));
    expect(charter.durationMinutes).toBeNull();
    expect(charter.packageName).toBe("Sunset");
  });
});
