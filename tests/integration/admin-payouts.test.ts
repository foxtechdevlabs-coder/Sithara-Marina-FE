import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isPayable, lineNote, statementStatus } from "@/features/admin/payouts/utils/payout-format";
import type { PayoutSummary, PayoutSummaryLine } from "@/services/admin/payouts.service";

// Payouts against a stubbed `fetch`, following the backend contract for /admin/payouts.
const API = "http://api.test";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const line = (ref: string, o: Partial<PayoutSummaryLine> = {}): PayoutSummaryLine => ({
  booking_id: `b-${ref}`,
  reference: ref,
  yacht_id: "y-1",
  yacht_name: "Malabar",
  starts_at: "2026-11-12T03:30:00.000Z",
  booking_status: "completed",
  gross_amount: 10_000_000,
  commission_rate: 15,
  commission_amount: 1_500_000,
  partner_payable: 8_500_000,
  payout_status: "outstanding",
  payout_id: null,
  payment_reference: null,
  ...o,
});

const summary = (lines: PayoutSummaryLine[]): PayoutSummary => ({
  partner: { id: "p-1", name: "Coastal Charters Co." },
  from: "2026-11-01",
  to: "2026-11-30",
  lines,
  totals: {
    gross_amount: 0,
    commission_amount: 0,
    partner_payable: 0,
    paid_amount: 0,
    outstanding_amount: 0,
  },
});

type Call = { url: string; method: string; body: unknown };
let calls: Call[];
function stub(respond: (url: string, method: string) => Response) {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const method = init.method ?? "GET";
      calls.push({
        url,
        method,
        body: typeof init.body === "string" ? JSON.parse(init.body) : undefined,
      });
      return respond(url, method);
    }),
  );
}

async function load() {
  vi.resetModules();
  const session = await import("@/services/admin/admin-session");
  session.saveTokens({ access_token: "access-1", refresh_token: "refresh-1", expires_in: 900 });
  return import("@/services/admin/payouts.service");
}

beforeEach(() => vi.stubEnv("NEXT_PUBLIC_API_URL", API));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("payout statement rules", () => {
  it("pays only completed, outstanding bookings", () => {
    expect(isPayable(line("SM-1"))).toBe(true);
    expect(isPayable(line("SM-2", { booking_status: "confirmed" }))).toBe(false);
    expect(isPayable(line("SM-3", { payout_status: "paid" }))).toBe(false);
  });

  it("explains each line", () => {
    expect(lineNote(line("SM-1"))).toBe("Outstanding");
    expect(lineNote(line("SM-2", { booking_status: "confirmed" }))).toBe(
      "Not completed yet · not payable",
    );
    expect(lineNote(line("SM-3", { payout_status: "paid", payment_reference: "NEFT-1" }))).toBe(
      "Paid · NEFT-1",
    );
    expect(lineNote(line("SM-4", { payout_status: "paid", booking_status: "refunded" }))).toBe(
      "Paid · now refunded, follow up",
    );
  });

  it("names the statement's state", () => {
    expect(statementStatus(summary([line("SM-1")]))).toBe("Unpaid");
    expect(statementStatus(summary([line("SM-1"), line("SM-2", { payout_status: "paid" })]))).toBe(
      "Partly paid",
    );
    expect(statementStatus(summary([line("SM-2", { payout_status: "paid" })]))).toBe("Paid");
    expect(statementStatus(summary([]))).toBe("Nothing to pay");
  });
});

describe("payouts service", () => {
  it("reads a partner's statement for a period", async () => {
    const payouts = await load();
    stub(() => json(summary([line("SM-1")])));
    const s = await payouts.getPayoutSummary("p-1", "2026-11-01", "2026-11-30");
    expect(s.lines[0]?.reference).toBe("SM-1");
    expect(calls[0]?.url).toBe(
      `${API}/admin/payouts/summary?partner_id=p-1&from=2026-11-01&to=2026-11-30`,
    );
  });

  it("records a payout with the bookings and their total", async () => {
    const payouts = await load();
    const detail = {
      id: "po-1",
      partner: { id: "p-1", name: "Coastal Charters Co." },
      paid_on: "2026-11-25",
      reference: "BANK-PAYOUT-1101",
      amount: 8_500_000,
      currency: "INR",
      notes: null,
      recorded_by_id: "s-1",
      created_at: "2026-11-25T10:00:00.000Z",
      lines: [line("SM-1")],
    };
    stub(() => json(detail, 201));
    const input = {
      partner_id: "p-1",
      booking_ids: ["b-SM-1"],
      paid_on: "2026-11-25",
      reference: "BANK-PAYOUT-1101",
      amount: 8_500_000,
    };
    const saved = await payouts.recordPayout(input);
    expect(saved.id).toBe("po-1");
    expect(calls[0]).toMatchObject({ method: "POST", url: `${API}/admin/payouts`, body: input });
  });

  it("lists payouts by partner", async () => {
    const payouts = await load();
    stub(() => json({ items: [], total: 0, page: 1, limit: 20 }));
    await payouts.listPayouts({ page: 1, limit: 20, partner_id: "p-1" });
    expect(calls[0]?.url).toBe(`${API}/admin/payouts?page=1&limit=20&partner_id=p-1`);
  });
});
