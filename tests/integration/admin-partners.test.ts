import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Admin partners against a stubbed `fetch`. Paths, methods and bodies follow
// the backend OpenAPI contract for /admin/partners/*.
const API = "http://api.test";
const ID = "22222222-2222-4222-8222-222222222222";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const partner = {
  id: ID,
  name: "Coastal Charters Co.",
  contact_name: "Asha Menon",
  email: "asha@coastal.test",
  phone: null,
  default_commission_rate: 15,
  agreement_effective_from: "2026-11-01",
  agreement_valid_till: "2026-12-31",
  bank_account_last4: null,
  is_active: true,
  created_at: "2026-11-01T10:00:00.000Z",
  updated_at: "2026-11-01T10:00:00.000Z",
};
const document = {
  id: "d-1",
  media_id: "33333333-3333-4333-8333-333333333333",
  title: "Agreement",
  filename: "Agreement.pdf",
  url: "https://bucket.test/agreement.pdf?signed=1",
  created_at: "2026-11-01T10:00:00.000Z",
};

type Call = { url: string; method: string; body: unknown; auth: string | null };
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
        auth: new Headers(init.headers).get("Authorization"),
      });
      return respond(url, method);
    }),
  );
}

async function load() {
  vi.resetModules();
  const session = await import("@/services/admin/admin-session");
  session.saveTokens({ access_token: "access-1", refresh_token: "refresh-1", expires_in: 900 });
  return import("@/services/admin/partners.service");
}

beforeEach(() => vi.stubEnv("NEXT_PUBLIC_API_URL", API));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("partners", () => {
  it("lists partners with the session token and filters", async () => {
    const partners = await load();
    stub(() => json({ items: [partner], total: 1, page: 2, limit: 20 }));
    const list = await partners.listPartners({ page: 2, limit: 20, search: "coastal" });
    expect(list.items[0]?.name).toBe("Coastal Charters Co.");
    expect(calls[0]).toMatchObject({
      method: "GET",
      url: `${API}/admin/partners?page=2&limit=20&search=coastal`,
      auth: "Bearer access-1",
    });
  });

  it("reads a partner with its documents", async () => {
    const partners = await load();
    stub(() => json({ ...partner, bank_details: null, documents: [document] }));
    const detail = await partners.getPartner(ID);
    expect(detail.documents[0]?.filename).toBe("Agreement.pdf");
    expect(calls[0]?.url).toBe(`${API}/admin/partners/${ID}`);
  });

  it("creates, updates, deactivates and sets the commission", async () => {
    const partners = await load();
    stub(() => json(partner));
    await partners.createPartner({ name: "Ananta Sailing", default_commission_rate: 12.5 });
    await partners.updatePartner(ID, { phone: null, agreement_valid_till: "2027-10-31" });
    await partners.updatePartner(ID, { is_active: false });
    await partners.setPartnerCommission(ID, 18);
    await partners.setPartnerCommission(ID, null);
    expect(calls.map((c) => [c.method, c.url.replace(API, ""), c.body])).toEqual([
      ["POST", "/admin/partners", { name: "Ananta Sailing", default_commission_rate: 12.5 }],
      ["PATCH", `/admin/partners/${ID}`, { phone: null, agreement_valid_till: "2027-10-31" }],
      ["PATCH", `/admin/partners/${ID}`, { is_active: false }],
      ["PUT", `/admin/partners/${ID}/commission`, { commission_rate: 18 }],
      ["PUT", `/admin/partners/${ID}/commission`, { commission_rate: null }],
    ]);
  });

  it("attaches a document and lists the partner's yachts", async () => {
    const partners = await load();
    stub((_url, method) => (method === "POST" ? json(document, 201) : json([])));
    await partners.attachPartnerDocument(ID, { media_id: document.media_id, title: "Agreement" });
    await expect(partners.listPartnerYachts(ID)).resolves.toEqual([]);
    expect(calls.map((c) => [c.method, c.url.replace(API, ""), c.body])).toEqual([
      [
        "POST",
        `/admin/partners/${ID}/documents`,
        { media_id: document.media_id, title: "Agreement" },
      ],
      ["GET", `/admin/partners/${ID}/yachts`, undefined],
    ]);
  });

  it("asks for an upload link for a partner document", async () => {
    await load();
    const media = await import("@/services/admin/media.service");
    stub(() => json({ statusCode: 503, code: "STORAGE_NOT_CONFIGURED", message: "No" }, 503));
    const file = new File(["%PDF-"], "Agreement.pdf", { type: "application/pdf" });
    await expect(media.uploadPartnerDocument(file)).rejects.toMatchObject({ status: 503 });
    expect(calls[0]).toMatchObject({
      method: "POST",
      url: `${API}/admin/media/uploads`,
      body: {
        purpose: "partner_document",
        filename: "Agreement.pdf",
        content_type: "application/pdf",
        size_bytes: 5,
      },
    });
  });
});
