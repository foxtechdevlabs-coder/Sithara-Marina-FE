"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { BODY, INK, MUTED, SAND } from "@/components/admin/admin-theme";
import { LoadState } from "@/components/admin/form-parts";
import { adminRoutes } from "@/constants/routes";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { fleetErrorMessage } from "@/features/admin/fleet/utils/fleet-error-message";
import { listPartnerYachts } from "@/services/admin/partners.service";

import { yachtCommissionText, yachtStatusText } from "../utils/partner-form";

/** The partner's yachts: table on desktop, cards on phones. GET /admin/partners/{id}/yachts. */
export function PartnerYachts({
  partnerId,
  defaultRate,
}: {
  partnerId: string;
  defaultRate: number | null;
}) {
  const query = useAdminQuery((signal) => listPartnerYachts(partnerId, signal), partnerId);
  const yachts = query.data;

  if (!yachts) {
    return (
      <LoadState
        loading={query.loading}
        label="Loading linked yachts"
        error={query.error ? `Couldn't load the yachts. ${fleetErrorMessage(query.error)}` : ""}
        onRetry={query.reload}
      />
    );
  }

  if (yachts.length === 0) {
    return (
      <p className="text-[14px]" style={{ color: BODY }}>
        No linked yachts yet.
      </p>
    );
  }

  return (
    <>
      <table className="hidden w-full border-collapse text-left text-[12px] lg:table">
        <caption className="sr-only">Linked yachts</caption>
        <thead style={{ backgroundColor: SAND }}>
          <tr className="text-[10px] tracking-[0.08em]" style={{ color: MUTED }}>
            {["Linked yacht", "Status", "Commission"].map((h) => (
              <th key={h} scope="col" className="h-[43px] px-[13px] font-normal">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white">
          {yachts.map((y) => (
            <tr key={y.id} className="border-b border-[#e3e1dc]">
              <th scope="row" className="h-[47px] w-[33%] px-[13px] font-normal">
                <Link href={adminRoutes.fleetYacht(y.id)} className="hover:underline">
                  {y.name}
                </Link>
              </th>
              <td className="w-[33%] px-[13px]">{yachtStatusText(y)}</td>
              <td className="px-[13px]">{yachtCommissionText(y, defaultRate)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="flex flex-col gap-[22px] lg:hidden">
        {yachts.map((y) => (
          <li key={y.id} className="border border-[#e3e1dc] bg-white px-[16px] pt-[20px] pb-[18px]">
            <h2 className="text-[18px] leading-[24px]">{y.name}</h2>
            <dl className="mt-[10px] text-[14px] leading-[20px]">
              <dt className="text-[12px]" style={{ color: BODY }}>
                Status
              </dt>
              <dd className="mt-[4px]">{yachtStatusText(y)}</dd>
              <dt className="mt-[12px] text-[12px]" style={{ color: BODY }}>
                Commission
              </dt>
              <dd className="mt-[4px]">{yachtCommissionText(y, defaultRate)}</dd>
            </dl>
            <Link
              href={adminRoutes.fleetYacht(y.id)}
              className="mt-[14px] flex h-[48px] w-[128px] items-center justify-center gap-[4px] border bg-white text-[11px] transition-colors hover:bg-[#f2f1ee]"
              style={{ borderColor: INK }}
            >
              View details
              <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-[11px]" />
              <span className="sr-only">for {y.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
