import { describe, expect, it } from "vitest";

import {
  agreementExpired,
  expiredAgreementMessage,
} from "@/features/admin/partners/utils/partner-form";

describe("partner agreement expiry", () => {
  const now = "2026-11-25";

  it("is expired only after the last day", () => {
    expect(agreementExpired({ agreement_valid_till: "2026-11-24" }, now)).toBe(true);
    expect(agreementExpired({ agreement_valid_till: "2026-11-25" }, now)).toBe(false);
    expect(agreementExpired({ agreement_valid_till: "2027-01-01" }, now)).toBe(false);
    expect(agreementExpired({ agreement_valid_till: "2026-10-31T00:00:00.000Z" }, now)).toBe(true);
  });

  it("never expires without an end date", () => {
    expect(agreementExpired({ agreement_valid_till: null }, now)).toBe(false);
  });

  it("says which partner and when it ended", () => {
    expect(
      expiredAgreementMessage({ name: "Coastal Co.", agreement_valid_till: "2026-10-31" }),
    ).toBe(
      "Coastal Co.’s agreement ended on 31 Oct 2026. Renew it on the partner’s page before adding a yacht for them.",
    );
  });
});
