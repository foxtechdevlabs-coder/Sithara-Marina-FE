import { describe, expect, it } from "vitest";

import {
  agreementPeriod,
  formatRate,
  parseRate,
  previewText,
  ruleRows,
} from "@/features/admin/commissions/utils/commission-format";
import {
  formatCell,
  periodOptions,
  periodText,
} from "@/features/admin/reports/utils/report-format";

describe("commission rates", () => {
  it("parses typed percentages", () => {
    expect(parseRate("15")).toBe(15);
    expect(parseRate("12.5%")).toBe(12.5);
    expect(parseRate("")).toBeNull();
    expect(parseRate("101")).toBeUndefined();
    expect(parseRate("1.234")).toBeUndefined();
    expect(parseRate("abc")).toBeUndefined();
    expect(formatRate(12.5)).toBe("12.5");
    expect(formatRate(null)).toBe("");
  });

  it("previews the design's example", () => {
    expect(previewText(15)).toBe(
      "Charter basis ₹ 1,00,000 × 15% = ₹ 15,000 commission. Partner gross payable ₹ 85,000 before settlement adjustments.",
    );
  });

  it("orders rules: yacht rates first, then the partner default", () => {
    const partner = {
      default_commission_rate: 15,
      agreement_effective_from: "2026-11-01",
      agreement_valid_till: "2026-12-31",
    };
    const rows = ruleRows(
      partner,
      [
        { id: "y1", name: "Malabar", commission_rate: 12 },
        { id: "y2", name: "Neelam", commission_rate: null },
      ],
      "2026-11-10",
    );
    expect(rows.map((r) => [r.rule, r.yacht, r.period, r.priority])).toEqual([
      ["Yacht rate · 12%", "Malabar", "01 Nov–31 Dec", "1"],
      ["Partner agreement · 15%", "Neelam", "01 Nov–31 Dec", "2"],
    ]);
    expect(ruleRows(partner, [], "2027-01-05")[0]!.priority).toBe("Historical");
    expect(agreementPeriod(null, "2026-10-31")).toBe("Until 31 Oct");
  });
});

describe("report formats", () => {
  it("formats cells by column type", () => {
    expect(formatCell(13_125_000, "money")).toBe("₹ 1,31,250");
    expect(formatCell(37.14, "percent")).toBe("37.1%");
    expect(formatCell("2026-11-20", "date")).toBe("20 Nov 2026");
    expect(formatCell("pending_payment", "text")).toBe("Pending payment");
    expect(formatCell(null, "money")).toBe("—");
  });

  it("offers periods around this month", () => {
    const p = periodOptions("2026-11-10");
    expect(p[0]).toMatchObject({ from: "2026-11-01", to: "2026-11-30" });
    expect(p.find((x) => x.key === "last-3")).toMatchObject({
      from: "2026-09-01",
      to: "2026-11-30",
    });
    expect(periodText("2026-11-01", "2026-11-30")).toBe("01–30 November 2026");
    expect(periodText("2026-09-01", "2026-11-30")).toMatch(/^1 Sept? 2026 – 30 Nov 2026$/);
  });
});
