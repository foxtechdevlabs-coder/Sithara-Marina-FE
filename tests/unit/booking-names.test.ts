import { describe, expect, it } from "vitest";

import { bookingNames } from "@/features/admin/bookings/utils/booking-format";

const contact = (full_name: string) => ({ full_name });

describe("booking row names", () => {
  it("shows the guest the search matches, and who booked it when that differs", () => {
    expect(
      bookingNames({ contact: contact("Ananya Menon"), customer: { full_name: "Rahul Nair" } }),
    ).toEqual({ guest: "Ananya Menon", bookedBy: "Rahul Nair" });
  });

  it("doesn't repeat the name when the guest booked it", () => {
    expect(
      bookingNames({ contact: contact("Ananya Menon"), customer: { full_name: "ananya menon" } }),
    ).toEqual({ guest: "Ananya Menon", bookedBy: null });
    expect(bookingNames({ contact: contact("Walk-in Guest"), customer: null })).toEqual({
      guest: "Walk-in Guest",
      bookedBy: null,
    });
  });

  it("falls back to the account name when the contact has none", () => {
    expect(bookingNames({ contact: contact(" "), customer: { full_name: "Rahul Nair" } })).toEqual({
      guest: "Rahul Nair",
      bookedBy: null,
    });
  });
});
