/*
 * Mock customer-account data, used by the account services until the NestJS
 * endpoints exist. Shapes follow the services' Zod schemas (snake_case, amounts
 * in paise, dates "YYYY-MM-DD", times "HH:mm") — the conventions of the
 * backend's published booking endpoints. Import only from `src/services/user`
 * (the services read it through `customer-account.store.ts`).
 */

export const MOCK_PROFILE = {
  id: "cus_ananya",
  full_name: "Ananya Menon",
  email: "ananya@example.com",
  email_verified: true,
  phone: "+91 9XXXX XXXXX",
  country: "India",
  photo_url: null,
  billing: {
    address: null,
    city: "Kochi",
    state: "Kerala",
    postal_code: null,
  },
};

export const MOCK_NOTIFICATION_PREFERENCES = {
  proposal_emails: true,
  whatsapp_updates: false,
  stories_and_offers: false,
};

export const MOCK_BOOKINGS = [
  {
    id: "SM-2026-1048",
    reference: "SM-2026-1048",
    status: "confirmed",
    yacht: {
      id: "yacht_astra_one",
      slug: "astra-one",
      name: "Astra One",
      image_url: "/images/yachts/astra-one-arabian-sea.png",
    },
    date: "2026-11-12",
    start_time: "09:00",
    end_time: "13:00",
    duration_minutes: 240,
    time_zone: "Asia/Kolkata",
    departure: "Kochi",
    service: "Private, fully crewed",
    guest_count: 8,
    capacity: 12,
    lead_guest: "Ananya Menon",
    on_board: "Seasonal menu · 8 guests",
    currency: "INR",
    price_lines: [
      { label: "Private charter", amount: 11_250_000 },
      { label: "Seasonal menu · 8 guests", amount: 1_250_000 },
      { label: "Taxes", amount: 625_000 },
    ],
    total_amount: 13_125_000,
    invoice_number: "SM-INV-1048",
    can_cancel: true,
  },
  {
    id: "SM-2026-0924",
    reference: "SM-2026-0924",
    status: "completed",
    yacht: {
      id: "yacht_malabar",
      slug: "malabar",
      name: "Malabar",
      image_url: "/images/home/featured-yacht-arc.png",
    },
    date: "2026-09-14",
    start_time: "09:00",
    end_time: "13:00",
    duration_minutes: 240,
    time_zone: "Asia/Kolkata",
    departure: "Kochi",
    service: "Private, fully crewed",
    guest_count: 6,
    capacity: 8,
    lead_guest: "Ananya Menon",
    on_board: null,
    currency: "INR",
    price_lines: [
      { label: "Private charter", amount: 10_000_000 },
      { label: "Taxes", amount: 500_000 },
    ],
    total_amount: 10_500_000,
    invoice_number: "SM-INV-0924",
    can_cancel: false,
  },
];

export const MOCK_INVOICES = [
  {
    invoice_number: "SM-INV-1048",
    booking_id: "SM-2026-1048",
    booking_reference: "SM-2026-1048",
    charter_date: "2026-11-12",
    issued_on: "2026-10-25",
    issuer: { name: "Sithara Marina", address: "Kochi · Kerala · India" },
    issued_to: { full_name: "Ananya Menon", email: "ananya@example.com" },
    currency: "INR",
    lines: [
      { description: "Astra One · 4-hour charter", quantity: "1", amount: 11_250_000 },
      { description: "Seasonal menu", quantity: "8 guests", amount: 1_250_000 },
      { description: "Taxes", quantity: "As charged", amount: 625_000 },
    ],
    total_amount: 13_125_000,
    payment_status: "paid",
  },
  {
    invoice_number: "SM-INV-0924",
    booking_id: "SM-2026-0924",
    booking_reference: "SM-2026-0924",
    charter_date: "2026-09-14",
    issued_on: "2026-08-30",
    issuer: { name: "Sithara Marina", address: "Kochi · Kerala · India" },
    issued_to: { full_name: "Ananya Menon", email: "ananya@example.com" },
    currency: "INR",
    lines: [
      { description: "Malabar · 4-hour private charter", quantity: "1", amount: 10_000_000 },
      { description: "Applicable taxes", quantity: "As charged", amount: 500_000 },
    ],
    total_amount: 10_500_000,
    payment_status: "paid",
  },
];

export const MOCK_ENQUIRIES = [
  {
    id: "SM-E-208",
    reference: "SM-E-208",
    yacht_name: "Astra One",
    preferred_date: "2026-12-20",
    guest_count: 10,
    occasion: "Family celebration",
    submitted_on: "2026-11-02",
    status: "proposal_ready",
  },
];

/**
 * Share of the paid total the mock "policy" refunds on an approved
 * cancellation (₹ 26,250 of ₹ 1,31,250, as in the Figma).
 */
export const MOCK_REFUND_SHARE = 0.2;
