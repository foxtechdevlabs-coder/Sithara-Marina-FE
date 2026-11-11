"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { BODY, GRADIENT, INK, MUTED, SAND } from "@/components/admin/admin-theme";
import { LoadingLogo } from "@/components/shared/loading-logo";
import { adminRoutes } from "@/constants/routes";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { useDebounced } from "@/features/admin/fleet/hooks/use-debounced";
import { fleetErrorMessage } from "@/features/admin/fleet/utils/fleet-error-message";
import { listYachts } from "@/services/admin/fleet.service";
import {
  listPartners,
  type Partner,
  type PartnerListQuery,
} from "@/services/admin/partners.service";

import { agreementText } from "../utils/partner-form";

const PAGE_SIZE = 20;
/** The API's largest page; one request covers the yacht names of every partner. */
const YACHT_LIMIT = 100;

const field =
  "h-[50px] w-full border border-[#d8d6d1] bg-white px-[14px] text-[14px] outline-none placeholder:text-[#0d1b2a] focus:border-[#0d1b2a] focus:placeholder:text-[#9a9da1]";
const outlineButton =
  "flex h-[48px] items-center justify-center border bg-white text-[11px] transition-colors hover:bg-[#f2f1ee] disabled:cursor-not-allowed disabled:opacity-60";

const statusText = (p: Partner) => (p.is_active ? "Active" : "Inactive");

/**
 * Partners ("Our partners, together."), from the admin Figma design: actions,
 * search and the partner table (cards on phones). Data: GET /admin/partners,
 * and GET /admin/yachts?ownership=partner for the yacht names.
 */
export function PartnerList() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const search = useDebounced(query.trim());

  const request: PartnerListQuery = {
    page,
    limit: PAGE_SIZE,
    ...(search ? { search: search.slice(0, 100) } : {}),
  };
  const list = useAdminQuery((signal) => listPartners(request, signal), JSON.stringify(request));
  const yachts = useAdminQuery(
    (signal) => listYachts({ ownership: "partner", limit: YACHT_LIMIT }, signal),
    "partner-yachts",
  );

  const yachtNames = (partnerId: string) =>
    yachts.data?.items
      .filter((y) => y.partner?.id === partnerId)
      .map((y) => y.name)
      .join(", ") || "—";

  const rows = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const first = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);
  const emptyText = search ? "No partners match this search." : "No partners yet. Add your first.";
  const loadError = list.error
    ? `Couldn't load the partners. ${fleetErrorMessage(list.error)}`
    : "";

  return (
    <div className="px-[20px] pt-[20px] pb-[48px] lg:pt-[33px] lg:pr-[47px] lg:pb-[60px] lg:pl-[46px]">
      <p className="text-[10px] tracking-[0.12em] uppercase" style={{ color: MUTED }}>
        Sithara Marina / Admin
      </p>
      <h1 className="mt-[18px] text-[30px] leading-[1.15] font-normal tracking-[-0.8px] lg:mt-[28px] lg:text-[43px] lg:tracking-[-1.3px]">
        Our partners, together.
      </h1>
      <p className="mt-[16px] text-[12px] leading-[19px] lg:mt-[28px]" style={{ color: BODY }}>
        Partner information, agreements and linked yachts.
      </p>

      <div className="mt-[20px] flex flex-col items-start gap-[14px] sm:flex-row lg:mt-[26px]">
        <Link
          href={adminRoutes.partnerNew}
          className="flex h-[48px] w-[148px] items-center justify-center text-[11px] transition-opacity hover:opacity-90"
          style={{ background: GRADIENT }}
        >
          Add partner
        </Link>
        <Link
          href={adminRoutes.commissions}
          className={`${outlineButton} w-[148px]`}
          style={{ borderColor: INK }}
        >
          View commissions
        </Link>
      </div>

      <div className="mt-[24px] lg:mt-[36px] lg:max-w-[472px]">
        <label htmlFor="partner-search" className="block text-[10px]" style={{ color: BODY }}>
          Search partners
        </label>
        <input
          id="partner-search"
          type="search"
          value={query}
          maxLength={100}
          onChange={(e) => {
            setQuery(e.currentTarget.value);
            setPage(1);
          }}
          placeholder="Company, contact or email"
          className={`${field} mt-[8px]`}
        />
      </div>

      <p aria-live="polite" className="sr-only">
        {list.loading
          ? "Loading partners"
          : list.error
            ? loadError
            : `${total} ${total === 1 ? "partner" : "partners"} found`}
      </p>

      {list.error && !list.loading ? (
        <div role="alert" className="mt-[44px] flex flex-col items-start gap-[14px] lg:mt-[50px]">
          <p className="text-[14px]">{loadError}</p>
          <button
            type="button"
            onClick={list.reload}
            className={`${outlineButton} w-[128px]`}
            style={{ borderColor: INK }}
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          {/* Desktop: table */}
          <table
            aria-busy={list.loading}
            className="mt-[50px] hidden w-full border-collapse text-left text-[12px] lg:table"
          >
            <caption className="sr-only">Partners</caption>
            <thead style={{ backgroundColor: SAND }}>
              <tr className="text-[10px] tracking-[0.08em]" style={{ color: MUTED }}>
                {["Partner", "Yachts", "Agreement", "Status"].map((h) => (
                  <th key={h} scope="col" className="h-[43px] w-[25%] px-[13px] font-normal">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white">
              {list.loading && !list.data ? (
                <tr>
                  <td colSpan={4} className="h-[80px] px-[13px]" style={{ color: MUTED }}>
                    <LoadingLogo label="Loading partners" size="compact" />
                  </td>
                </tr>
              ) : (
                rows.map((p) => (
                  <tr
                    key={p.id}
                    className={`border-b border-[#e3e1dc] ${list.loading ? "opacity-60" : ""}`}
                  >
                    <th scope="row" className="h-[47px] px-[13px] font-normal">
                      <Link href={adminRoutes.partner(p.id)} className="hover:underline">
                        {p.name}
                      </Link>
                    </th>
                    <td className="px-[13px]">{yachtNames(p.id)}</td>
                    <td className="px-[13px]">{agreementText(p)}</td>
                    <td className="px-[13px]">{statusText(p)}</td>
                  </tr>
                ))
              )}
              {!list.loading && rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="h-[60px] px-[13px]" style={{ color: BODY }}>
                    {emptyText}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Phones and tablets: one card per partner */}
          <ul aria-busy={list.loading} className="mt-[44px] flex flex-col gap-[22px] lg:hidden">
            {list.loading && !list.data && (
              <li style={{ color: MUTED }}>
                <LoadingLogo label="Loading partners" size="compact" />
              </li>
            )}
            {rows.map((p) => (
              <li
                key={p.id}
                className={`border border-[#e3e1dc] bg-white px-[20px] pt-[24px] pb-[20px] ${list.loading ? "opacity-60" : ""}`}
              >
                <h2 className="text-[20px] leading-[26px]">{p.name}</h2>
                <dl className="mt-[10px] text-[14px] leading-[20px]">
                  {[
                    ["Yachts", yachtNames(p.id)],
                    ["Agreement", agreementText(p)],
                    ["Status", statusText(p)],
                  ].map(([term, value], i) => (
                    <div key={term} className={i > 0 ? "mt-[12px]" : ""}>
                      <dt className="text-[12px]" style={{ color: BODY }}>
                        {term}
                      </dt>
                      <dd className="mt-[4px]">{value}</dd>
                    </div>
                  ))}
                </dl>
                <Link
                  href={adminRoutes.partner(p.id)}
                  className={`${outlineButton} mt-[14px] w-[128px] gap-[4px]`}
                  style={{ borderColor: INK }}
                >
                  View details
                  <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-[11px]" />
                  <span className="sr-only">for {p.name}</span>
                </Link>
              </li>
            ))}
            {!list.loading && rows.length === 0 && (
              <li className="text-[14px]" style={{ color: BODY }}>
                {emptyText}
              </li>
            )}
          </ul>

          {total > PAGE_SIZE && (
            <nav
              aria-label="Partner pages"
              className="mt-[22px] flex flex-wrap items-center gap-[14px] text-[12px]"
            >
              <span style={{ color: BODY }}>
                Showing {first}–{last} of {total}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => p - 1)}
                disabled={page <= 1 || list.loading}
                className={`${outlineButton} w-[96px]`}
                style={{ borderColor: INK }}
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={last >= total || list.loading}
                className={`${outlineButton} w-[96px]`}
                style={{ borderColor: INK }}
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
