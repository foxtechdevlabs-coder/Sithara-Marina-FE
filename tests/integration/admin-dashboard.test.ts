import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  formatCompactRupees,
  formatDepartureDate,
  formatPercent,
  pendingPaymentsText,
  recentMonths,
  statusLabel,
} from "@/features/admin/dashboard/utils/dashboard-format";

// GET /admin/dashboard against a stubbed `fetch`, following the OpenAPI contract.
const API = "http://api.test";

const full = {
  period: { from: "2026-11-01", to: "2026-11-30" },
  charters: { today: [], upcoming: [], upcoming_total: 0 },
  activity: {
    new_bookings: 3,
    confirmed: 2,
    pending: 1,
    cancelled: 0,
    completed: 0,
    refunded: 0,
    no_show: 0,
  },
  pending_payments: { count: 1, amount: 4_720_000 },
  revenue: { booked_amount: 2_860_000_00, tax_amount: 436_000_00, currency: "INR" },
  utilisation: { percent: 16.7, yachts: [] },
  alerts: [],
};

async function load() {
  vi.resetModules();
  const session = await import("@/services/admin/admin-session");
  session.saveTokens({ access_token: "access-1", refresh_token: "refresh-1", expires_in: 900 });
  return import("@/services/admin/dashboard.service");
}

beforeEach(() => vi.stubEnv("NEXT_PUBLIC_API_URL", API));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("GET /admin/dashboard", () => {
  it("sends the period and the admin token", async () => {
    const { getDashboard } = await load();
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(full), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const data = await getDashboard({ from: "2026-11-01", to: "2026-11-30" });

    expect(data.activity?.confirmed).toBe(2);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`${API}/admin/dashboard?from=2026-11-01&to=2026-11-30`);
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer access-1");
  });

  it("accepts null blocks for accounts without the permission", async () => {
    const { getDashboard } = await load();
    const nulls = {
      period: full.period,
      charters: null,
      activity: null,
      pending_payments: null,
      revenue: null,
      utilisation: null,
      alerts: null,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(nulls), { status: 200 })),
    );
    await expect(getDashboard()).resolves.toMatchObject({ charters: null, revenue: null });
  });
});

describe("dashboard formatting", () => {
  it("builds month periods with exact dates", () => {
    const [current, previous] = recentMonths(new Date(2026, 10, 4));
    expect(current).toEqual({
      label: "01–30 November 2026",
      from: "2026-11-01",
      to: "2026-11-30",
    });
    expect(previous!.to).toBe("2026-10-31");
    expect(recentMonths(new Date(2026, 0, 15))[1]!.from).toBe("2025-12-01");
  });

  it("formats rupees like the design", () => {
    expect(formatCompactRupees(2_860_000_00)).toBe("₹ 28.6L");
    expect(formatCompactRupees(1_01_00_000_00)).toBe("₹ 1.01 Cr");
    expect(formatCompactRupees(45_000_00)).toBe("₹ 45,000");
    expect(formatCompactRupees(0)).toBe("₹ 0");
  });

  it("formats percentages, statuses, dates and pending payments", () => {
    expect(formatPercent(16.68)).toBe("16.7%");
    expect(formatPercent(68)).toBe("68%");
    expect(statusLabel("pending_payment")).toBe("Awaiting payment");
    expect(statusLabel("something_new")).toBe("Something new");
    // 20:00 UTC on 11 Nov is already 12 Nov in Kochi.
    expect(formatDepartureDate("2026-11-11T20:00:00.000Z")).toBe("12 Nov");
    expect(pendingPaymentsText({ count: 1, amount: 47_200_00 })).toBe(
      "1 pending payment (₹ 47,200)",
    );
  });
});
