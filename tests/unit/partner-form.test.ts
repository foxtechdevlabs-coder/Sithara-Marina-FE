import { describe, expect, it } from "vitest";

import {
  EMPTY_PARTNER_FORM,
  agreementText,
  commissionChange,
  documentTitle,
  newestFirst,
  partnerChanges,
  partnerFormErrors,
  partnerFormFromPartner,
  partnerInput,
  yachtCommissionText,
  yachtStatusText,
} from "@/features/admin/partners/utils/partner-form";
import { partnerDocumentProblem } from "@/services/admin/media.service";
import type { Partner, PartnerDocument } from "@/services/admin/partners.service";

const partner: Partner = {
  id: "p-1",
  name: "Coastal Charters Co.",
  contact_name: "Asha Menon",
  email: "asha@coastal.test",
  phone: null,
  default_commission_rate: 15,
  agreement_effective_from: "2026-11-01",
  agreement_valid_till: "2026-12-31",
  is_active: true,
  created_at: "2026-11-01T10:00:00.000Z",
  updated_at: "2026-11-01T10:00:00.000Z",
};

const doc = (id: string, created_at: string): PartnerDocument => ({
  id,
  media_id: `m-${id}`,
  title: id,
  filename: `${id}.pdf`,
  url: `https://cdn.test/${id}`,
  created_at,
});

describe("partner form", () => {
  it("requires the design's fields and a real email", () => {
    expect(Object.keys(partnerFormErrors(EMPTY_PARTNER_FORM))).toEqual([
      "partner-name",
      "partner-contact",
      "partner-email",
    ]);
    const form = partnerFormFromPartner(partner);
    expect(partnerFormErrors(form)).toEqual({});
    expect(partnerFormErrors({ ...form, email: "not-an-email" })).toHaveProperty("partner-email");
    expect(partnerFormErrors({ ...form, commission: "100.5" })).toHaveProperty(
      "partner-commission",
    );
    expect(partnerFormErrors({ ...form, phone: "1".repeat(31) })).toHaveProperty("partner-phone");
  });

  it("trims what it sends and turns empty fields into null", () => {
    expect(
      partnerInput({
        name: "  Ananta Sailing ",
        contact: " Ravi ",
        email: "ravi@ananta.test",
        phone: "  ",
        commission: "12.5%",
        agreementFrom: "2026-11-01",
        agreementTill: "",
      }),
    ).toEqual({
      name: "Ananta Sailing",
      contact_name: "Ravi",
      email: "ravi@ananta.test",
      phone: null,
      default_commission_rate: 12.5,
      agreement_effective_from: "2026-11-01",
      agreement_valid_till: null,
    });
  });

  it("sends only what changed, with the commission on its own", () => {
    const form = partnerFormFromPartner(partner);
    expect(partnerChanges(form, partner)).toEqual({});
    expect(commissionChange(form, partner)).toBeUndefined();

    const edited = { ...form, contact: "", phone: "+91 90000 00000", commission: "" };
    expect(partnerChanges(edited, partner)).toEqual({
      contact_name: null,
      phone: "+91 90000 00000",
    });
    expect(commissionChange(edited, partner)).toBeNull();
    expect(commissionChange({ ...form, commission: "18" }, partner)).toBe(18);
  });
});

describe("agreement dates", () => {
  const form = partnerFormFromPartner(partner);

  it("loads them into date fields, even with a time on them", () => {
    expect(form.agreementFrom).toBe("2026-11-01");
    expect(
      partnerFormFromPartner({ ...partner, agreement_valid_till: "2026-12-31T00:00:00.000Z" })
        .agreementTill,
    ).toBe("2026-12-31");
    expect(
      partnerChanges(form, { ...partner, agreement_valid_till: "2026-12-31T00:00:00.000Z" }),
    ).toEqual({});
  });

  it("refuses an end before the start, and allows the same day or an open end", () => {
    expect(partnerFormErrors({ ...form, agreementTill: "2026-10-31" })).toHaveProperty(
      "partner-valid",
    );
    expect(partnerFormErrors({ ...form, agreementTill: "2026-11-01" })).toEqual({});
    expect(partnerFormErrors({ ...form, agreementTill: "" })).toEqual({});
  });

  it("sends only the date that changed, and null when emptied", () => {
    expect(partnerChanges({ ...form, agreementTill: "2027-10-31" }, partner)).toEqual({
      agreement_valid_till: "2027-10-31",
    });
    expect(partnerChanges({ ...form, agreementFrom: "" }, partner)).toEqual({
      agreement_effective_from: null,
    });
  });

  it("describes the agreement for the list", () => {
    const dates = (from: string | null, till: string | null) => ({
      agreement_effective_from: from,
      agreement_valid_till: till,
    });
    const now = "2026-11-05";
    expect(agreementText(dates(null, null), now)).toBe("Not set");
    expect(agreementText(dates("2026-11-01", "2026-12-31"), now)).toBe("Current · 31 Dec 2026");
    expect(agreementText(dates("2026-11-01", "2026-11-05"), now)).toBe("Current · 05 Nov 2026");
    expect(agreementText(dates("2026-01-01", "2026-11-04"), now)).toBe("Expired · 04 Nov 2026");
    expect(agreementText(dates("2026-12-01", "2027-11-30"), now)).toBe("Starts · 01 Dec 2026");
    expect(agreementText(dates("2026-11-01", null), now)).toBe("Current");
    expect(agreementText(dates(null, "2026-12-31"), now)).toBe("Current · 31 Dec 2026");
  });
});

describe("agreement", () => {
  const older = doc("old", "2026-01-01T10:00:00.000Z");
  const newer = doc("new", "2026-11-01T10:00:00.000Z");

  it("treats the newest document as the current one", () => {
    expect(newestFirst([older, newer]).map((d) => d.id)).toEqual(["new", "old"]);
  });

  it("titles a document from its file name", () => {
    expect(documentTitle("Agreement 2026.pdf")).toBe("Agreement 2026");
    expect(documentTitle(".pdf")).toBe(".pdf");
    expect(documentTitle(`${"a".repeat(250)}.pdf`)).toHaveLength(200);
  });

  it("refuses files the backend would refuse, before uploading", () => {
    const file = (type: string, size = 1) =>
      new File([new Uint8Array(size)], "agreement", { type });
    expect(partnerDocumentProblem(file("application/pdf"))).toBeNull();
    expect(partnerDocumentProblem(file("image/png"))).toBeNull();
    expect(partnerDocumentProblem(file("image/webp"))).toMatch(/PDF, JPEG or PNG/);
    expect(partnerDocumentProblem(file("application/pdf", 0))).toMatch(/empty/);
    expect(partnerDocumentProblem(file("application/pdf", 20 * 1024 * 1024 + 1))).toMatch(/20 MB/);
  });
});

describe("linked yachts", () => {
  it("shows a yacht's own rate, else the partner's default", () => {
    expect(yachtCommissionText({ commission_rate: 15 }, 12)).toBe("15%");
    expect(yachtCommissionText({ commission_rate: 0 }, 12)).toBe("0%");
    expect(yachtCommissionText({ commission_rate: null }, 12)).toBe("12% · Partner default");
    expect(yachtCommissionText({ commission_rate: null }, null)).toBe("—");
  });

  it("describes the yacht's status", () => {
    expect(yachtStatusText({ is_active: true, is_visible: true })).toBe("Visible · Active");
    expect(yachtStatusText({ is_active: true, is_visible: false })).toBe("Hidden · Active");
    expect(yachtStatusText({ is_active: false, is_visible: true })).toBe("Inactive");
  });
});
