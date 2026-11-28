import { describe, expect, it } from "vitest";

import { proposalLength } from "@/features/user/enquiries/components/proposal-detail";
import type { Proposal } from "@/services/user/enquiries.service";

// What the customer sees as a proposal's charter length (GET /me/proposals/{id}).
const proposal = (over: Partial<Proposal>): Proposal => ({
  id: "p-1",
  enquiry_id: "e-1",
  enquiry_reference: "ENQ-2026-0001",
  version: 1,
  status: "sent",
  yacht: { id: "y-1", name: "Astra One", slug: "astra-one" },
  slot_type_id: "s-4",
  slot_type_name: "Sunset",
  duration_minutes: null,
  date: "2026-12-20",
  start_time: "16:00",
  end_time: "20:00",
  guests: 8,
  inclusions: [],
  message: null,
  terms: null,
  pricing: {
    currency: "INR",
    charter_amount: 6_000_000,
    addons: [],
    addons_amount: 0,
    subtotal: 6_000_000,
    tax_rate: 18,
    tax_amount: 1_080_000,
    total_amount: 7_080_000,
  },
  expires_at: null,
  sent_at: null,
  decided_at: null,
  decision_comment: null,
  checkout_session_id: null,
  created_at: "2026-11-01T00:00:00.000Z",
  ...over,
});

describe("customer proposal length", () => {
  it("names a package and its duration", () => {
    expect(proposalLength(proposal({}))).toEqual({ name: "Sunset", duration: "4 hours" });
  });

  it("shows a custom proposal as a custom charter with its agreed length, not a package", () => {
    expect(
      proposalLength(
        proposal({
          slot_type_id: null,
          slot_type_name: "Custom",
          duration_minutes: 330,
          end_time: "21:30",
        }),
      ),
    ).toEqual({ name: "Custom charter", duration: "5 hours 30 min" });
  });
});
