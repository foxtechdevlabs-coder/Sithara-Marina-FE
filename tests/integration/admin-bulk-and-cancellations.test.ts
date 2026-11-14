import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { durationWords } from "@/features/admin/bookings/components/cancellation-request-detail";

// Bulk availability blocks and cancellation requests against a stubbed `fetch`,
// following the backend contract (POST /admin/availability-blocks/bulk,
// /admin/cancellation-requests/*).
const API = "http://api.test";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

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
  return {
    availability: await import("@/services/admin/availability.service"),
    requests: await import("@/services/admin/cancellation-requests.service"),
    errors: await import("@/services/http/api-error"),
  };
}

beforeEach(() => vi.stubEnv("NEXT_PUBLIC_API_URL", API));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const block = (id: string, yacht: string) => ({
  id,
  yacht: { id: yacht, name: yacht },
  starts_at: "2026-11-20T02:30:00.000Z",
  ends_at: "2026-11-20T12:30:00.000Z",
  reason: "weather",
  note: null,
  created_by_id: "s-1",
  batch_id: "batch-1",
  created_at: "2026-11-10T10:00:00.000Z",
  updated_at: "2026-11-10T10:00:00.000Z",
});
const conflict = {
  yacht_id: "y-2",
  yacht_name: "Neelam",
  booking_references: ["SM-2026-0042"],
  checkout_in_progress: false,
};

describe("bulk availability blocks", () => {
  it("refuses with the conflicts, then blocks the others", async () => {
    const { availability, errors } = await load();
    let skip = false;
    stub(() =>
      skip
        ? json({ batch_id: "batch-1", blocks: [block("k-1", "y-1")], skipped: [conflict] }, 201)
        : json(
            {
              statusCode: 409,
              code: "BLOCK_CONFLICT",
              message: "x",
              details: { conflicts: [conflict] },
            },
            409,
          ),
    );
    const input = {
      yacht_ids: ["y-1", "y-2"],
      starts_at: "2026-11-20T08:00:00+05:30",
      ends_at: "2026-11-20T18:00:00+05:30",
      reason: "weather" as const,
    };
    const err = await availability.createBulkBlocks(input).catch((e: unknown) => e);
    expect(errors.isApiError(err) && err.code).toBe("BLOCK_CONFLICT");
    expect(availability.bulkConflicts(errors.isApiError(err) ? err.body : null)).toEqual([
      conflict,
    ]);

    skip = true;
    const result = await availability.createBulkBlocks({ ...input, skip_conflicts: true });
    expect(result.blocks).toHaveLength(1);
    expect(result.skipped[0]?.yacht_name).toBe("Neelam");
    expect(calls[1]).toMatchObject({
      method: "POST",
      url: `${API}/admin/availability-blocks/bulk`,
      body: { ...input, skip_conflicts: true },
    });
  });

  it("blocks the whole active fleet and removes a batch", async () => {
    const { availability } = await load();
    stub((_url, method) =>
      method === "DELETE"
        ? new Response(null, { status: 204 })
        : json({ batch_id: null, blocks: [], skipped: [] }, 201),
    );
    await availability.createBulkBlocks({
      all_active: true,
      starts_at: "2026-11-20T08:00:00+05:30",
      ends_at: "2026-11-20T18:00:00+05:30",
      reason: "maintenance",
    });
    await availability.deleteBlockBatch("batch-1");
    expect(calls[0]?.body).toMatchObject({ all_active: true });
    expect(calls[1]).toMatchObject({
      method: "DELETE",
      url: `${API}/admin/availability-blocks/batches/batch-1`,
    });
  });

  it("finds no conflicts in an unexpected body", async () => {
    const { availability } = await load();
    expect(availability.bulkConflicts({ message: "x" })).toEqual([]);
    expect(availability.bulkConflicts(null)).toEqual([]);
  });
});

const request = {
  id: "cr-1",
  status: "pending",
  reason: "Family emergency",
  requested_at: "2026-11-10T10:00:00.000Z",
  requested_by: { id: "c-1", name: "Ananya Menon" },
  booking: {
    id: "b-1",
    reference: "SM-1048",
    status: "confirmed",
    yacht_id: "y-1",
    yacht_name: "Astra One",
    date: "2026-11-12",
    start_time: "09:00",
    end_time: "13:00",
    starts_at: "2026-11-12T03:30:00.000Z",
    contact_name: "Ananya Menon",
    contact_email: "a@x.test",
    contact_phone: null,
    total_amount: 13_125_000,
    currency: "INR",
  },
  decided_at: null,
  decided_by: null,
  decision_reason: null,
  refund_decision: null,
  refund_amount: null,
};

describe("cancellation requests", () => {
  it("lists pending requests oldest first", async () => {
    const { requests } = await load();
    stub(() => json({ items: [request], total: 1, page: 1, limit: 20 }));
    const list = await requests.listCancellationRequests({
      status: "pending",
      sort: "oldest",
      page: 1,
      limit: 20,
    });
    expect(list.items[0]?.booking.reference).toBe("SM-1048");
    expect(calls[0]?.url).toBe(
      `${API}/admin/cancellation-requests?status=pending&sort=oldest&page=1&limit=20`,
    );
  });

  it("approves with a partial refund and rejects with a reason", async () => {
    const { requests } = await load();
    stub(() => json({ ...request, status: "approved" }));
    await requests.approveCancellationRequest("cr-1", {
      refund_decision: "partial",
      refund_amount: 5_000_000,
      reason: "Within the free cancellation period",
    });
    await requests.rejectCancellationRequest("cr-1", "Inside 24 hours of departure");
    expect(calls.map((c) => [c.method, c.url.replace(API, ""), c.body])).toEqual([
      [
        "POST",
        "/admin/cancellation-requests/cr-1/approve",
        {
          refund_decision: "partial",
          refund_amount: 5_000_000,
          reason: "Within the free cancellation period",
        },
      ],
      [
        "POST",
        "/admin/cancellation-requests/cr-1/reject",
        { reason: "Inside 24 hours of departure" },
      ],
    ]);
  });

  it("words how early the customer asked", () => {
    expect(durationWords(2880)).toBe("2 days");
    expect(durationWords(1500)).toBe("1 day 1 hour");
    expect(durationWords(45)).toBe("45 minutes");
    expect(durationWords(-90)).toBe("1 hour 30 minutes");
  });
});
