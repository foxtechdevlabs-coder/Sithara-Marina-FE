"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BODY, MUTED } from "@/components/admin/admin-theme";
import { LoadState, Notice } from "@/components/admin/form-parts";
import { adminRoutes } from "@/constants/routes";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { usePublishBreadcrumbYacht } from "@/features/admin/fleet/hooks/use-breadcrumb-yacht";
import { fleetErrorMessage } from "@/features/admin/fleet/utils/fleet-error-message";
import { getSlotTypes, getYacht } from "@/services/admin/fleet.service";
import { listPriceRules } from "@/services/admin/pricing.service";
import { isApiError } from "@/services/http/api-error";

import { PriceRulesSection } from "./price-rules-section";
import { SlotSetupSection } from "./slot-setup-section";

/**
 * "Slots & pricing" for one yacht: operating hours, slot types and price
 * rules. Loads GET /admin/yachts/{id}, …/slot-types and …/price-rules.
 */
export function YachtPricing({ yachtId }: { yachtId: string }) {
  const query = useAdminQuery(async (signal) => {
    const [yacht, setup, rules] = await Promise.all([
      getYacht(yachtId, signal),
      getSlotTypes(yachtId, signal),
      listPriceRules(yachtId, {}, signal),
    ]);
    return { yacht, setup, rules };
  }, yachtId);
  const data = query.data;
  usePublishBreadcrumbYacht(data?.yacht);
  const [notice, setNotice] = useState("");
  const [setupFailed, setSetupFailed] = useState(false);

  // Message passed on from the add-yacht form (?notice=publish|setup).
  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("notice");
    if (value === "publish")
      queueMicrotask(() =>
        setNotice(
          "Yacht saved (hidden for now). Add a base price for a package here, then switch on “Visible on website” in Edit yacht to publish it.",
        ),
      );
    if (value === "setup")
      queueMicrotask(() => {
        setSetupFailed(true);
        setNotice(
          "The yacht was created, but its operating hours or package prices couldn't be saved. Check them below and save again.",
        );
      });
  }, []);

  return (
    <div className="px-[20px] pt-[20px] pb-[56px] lg:pt-[33px] lg:pr-[47px] lg:pl-[46px]">
      <p className="text-[10px] tracking-[0.12em] uppercase" style={{ color: MUTED }}>
        Sithara Marina / Admin
      </p>
      <h1 className="mt-[18px] text-[30px] leading-[1.15] font-normal tracking-[-0.8px] lg:mt-[24px] lg:text-[43px] lg:tracking-[-1.3px]">
        {data ? `${data.yacht.name},` : "Slots"}{" "}
        <em
          className="tracking-[-0.5px]"
          style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
        >
          {data ? "slots & pricing." : "& pricing."}
        </em>
      </h1>
      {data && (
        <p className="mt-[10px] text-[12px]" style={{ color: BODY }}>
          <Link
            href={adminRoutes.fleetYacht(yachtId)}
            className="underline underline-offset-2 hover:opacity-70"
          >
            Back to {data.yacht.name}
          </Link>
          {data.yacht.is_visible ? " · Visible on website" : " · Hidden from website"}
        </p>
      )}

      {!data ? (
        <>
          <LoadState
            loading={query.loading}
            label="Loading slots and prices"
            error={
              query.error ? `Couldn't load slots and prices. ${fleetErrorMessage(query.error)}` : ""
            }
            onRetry={
              isApiError(query.error) && query.error.status === 404 ? undefined : query.reload
            }
          />
          {Boolean(query.error) && (
            <Link href={adminRoutes.fleet} className="text-[12px] underline underline-offset-2">
              Back to the fleet
            </Link>
          )}
        </>
      ) : (
        <div className="mt-[32px] flex max-w-[1040px] flex-col gap-[24px]">
          {notice && <Notice tone={setupFailed ? "error" : "success"}>{notice}</Notice>}
          <SlotSetupSection
            yachtId={yachtId}
            setup={data.setup}
            ruleCount={(id) => data.rules.filter((r) => r.slot_type_id === id).length}
            onSaved={(setup) => {
              query.setData((d) => ({ ...d!, setup }));
              // Removed slot types take their price rules with them; reload the rules.
              listPriceRules(yachtId).then(
                (rules) => query.setData((d) => ({ ...d!, rules })),
                () => query.reload(),
              );
            }}
          />
          <PriceRulesSection
            yachtId={yachtId}
            slotTypes={[...data.setup.slot_types].sort((a, b) => a.sort_order - b.sort_order)}
            rules={data.rules}
            onRulesChange={(rules) => query.setData((d) => ({ ...d!, rules }))}
          />
        </div>
      )}
    </div>
  );
}
