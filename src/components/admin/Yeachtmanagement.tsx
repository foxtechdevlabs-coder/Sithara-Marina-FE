"use client";

import { ArrowRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { LoadingLogo } from "@/components/shared/loading-logo";
import { adminRoutes } from "@/constants/routes";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { useDebounced } from "@/features/admin/fleet/hooks/use-debounced";
import { useYachtStatus } from "@/features/admin/fleet/hooks/use-yacht-status";
import { fleetErrorMessage } from "@/features/admin/fleet/utils/fleet-error-message";
import { listYachts, type Yacht, type YachtListQuery } from "@/services/admin/fleet.service";

import { BODY, GRADIENT, INK, MUTED, SAND } from "./admin-theme";
import { Notice } from "./form-parts";

const PAGE_SIZE = 20;

const VIEWS = {
  all: "All · Active / Hidden / Inactive",
  active: "Active (visible)",
  hidden: "Hidden",
  inactive: "Inactive",
} as const;
type View = keyof typeof VIEWS;

/** View → GET /admin/yachts filters (status, visibility). */
const VIEW_QUERY: Record<View, Pick<YachtListQuery, "status" | "visibility">> = {
  all: {},
  active: { status: "active", visibility: "visible" },
  hidden: { status: "active", visibility: "hidden" },
  inactive: { status: "inactive" },
};

/* ------------------------------------------------------------------ */

const ownershipText = (y: Yacht) =>
  y.ownership_type === "own" ? "Owned" : y.partner ? `Partner · ${y.partner.name}` : "Partner";

const publicStatus = (y: Yacht) =>
  y.is_active ? `${y.is_visible ? "Visible" : "Hidden"} · Active` : "Inactive";

/** "Partner · Coastal Co." with a spaced dot, as in the design. */
function Dotted({ text }: { text: string }) {
  const parts = text.split(" · ");
  return (
    <>
      {parts.map((part, i) => (
        <span key={`${i}-${part}`}>
          {i > 0 && (
            <span aria-hidden="true" className="mx-[5px]">
              ·
            </span>
          )}
          {part}
        </span>
      ))}
    </>
  );
}

const field =
  "h-[50px] w-full border border-[#d8d6d1] bg-white px-[14px] text-[14px] outline-none placeholder:text-[#0d1b2a] focus:border-[#0d1b2a] focus:placeholder:text-[#9a9da1]";
const outlineButton =
  "flex h-[48px] items-center justify-center border bg-white text-[11px] transition-colors hover:bg-[#f2f1ee] disabled:cursor-not-allowed disabled:opacity-60";
const textAction = "text-[12px] underline underline-offset-2 hover:opacity-70 disabled:opacity-50";

/**
 * Yacht management ("The fleet, considered."), built from the admin Figma
 * design: actions, search and view filters, the fleet table (cards on
 * phones) and a note on visibility. Data: GET /admin/yachts.
 */
export default function YachtManagement() {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("all");
  const [page, setPage] = useState(1);
  const search = useDebounced(query.trim());

  const request: YachtListQuery = {
    page,
    limit: PAGE_SIZE,
    ...VIEW_QUERY[view],
    ...(search ? { search: search.slice(0, 100) } : {}),
  };
  const list = useAdminQuery((signal) => listYachts(request, signal), JSON.stringify(request));
  const status = useYachtStatus();

  const yachts = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const first = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);
  const filtered = Boolean(search) || view !== "all";
  const emptyText = filtered
    ? "No yachts match this search."
    : "No yachts yet. Add your first yacht.";
  const loadError = list.error ? `Couldn't load the fleet. ${fleetErrorMessage(list.error)}` : "";

  async function toggleActive(y: Yacht) {
    const result = await status.toggle(y);
    if (result) list.reload();
  }

  const actions = (y: Yacht) => (
    <span className="flex flex-wrap items-center gap-x-[14px] gap-y-[6px]">
      <Link href={adminRoutes.fleetYachtEdit(y.id)} className={textAction}>
        Edit<span className="sr-only"> {y.name}</span>
      </Link>
      <button
        type="button"
        onClick={() => void toggleActive(y)}
        disabled={status.pendingId !== null}
        aria-busy={status.pendingId === y.id}
        className={`${textAction} ${y.is_active ? "text-[#b3261e]" : "text-[#2e7d4f]"}`}
      >
        {status.pendingId === y.id
          ? y.is_active
            ? "Deactivating…"
            : "Activating…"
          : y.is_active
            ? "Deactivate"
            : "Activate"}
        <span className="sr-only"> {y.name}</span>
      </button>
    </span>
  );

  return (
    <div className="px-[20px] pt-[20px] pb-[48px] lg:pt-[33px] lg:pr-[47px] lg:pb-[60px] lg:pl-[46px]">
      <p className="text-[10px] tracking-[0.12em] uppercase" style={{ color: MUTED }}>
        Sithara Marina / Admin
      </p>
      <h1 className="mt-[18px] text-[30px] leading-[1.15] font-normal tracking-[-0.8px] lg:mt-[28px] lg:text-[43px] lg:tracking-[-1.3px]">
        The fleet, considered.
      </h1>
      <p className="mt-[16px] text-[12px] leading-[19px] lg:mt-[28px]" style={{ color: BODY }}>
        Manage the yachts and their public availability.
      </p>

      <div className="mt-[20px] flex flex-col items-start gap-[14px] sm:flex-row lg:mt-[26px]">
        <Link
          href={adminRoutes.fleetNew}
          className="flex h-[48px] w-[148px] items-center justify-center text-[11px] transition-opacity hover:opacity-90"
          style={{ background: GRADIENT }}
        >
          Add a yacht
        </Link>
        <Link
          href={adminRoutes.availability}
          className={`${outlineButton} w-[165px]`}
          style={{ borderColor: INK }}
        >
          Availability calendar
        </Link>
      </div>

      <div className="mt-[24px] grid gap-[44px] sm:grid-cols-2 sm:gap-[21px] lg:mt-[36px] lg:max-w-[965px]">
        <div>
          <label htmlFor="fleet-search" className="block text-[10px]" style={{ color: BODY }}>
            Search yachts
          </label>
          <input
            id="fleet-search"
            type="search"
            value={query}
            maxLength={100}
            onChange={(e) => {
              setQuery(e.currentTarget.value);
              setPage(1);
            }}
            placeholder="Name or URL name"
            className={`${field} mt-[8px]`}
          />
        </div>
        <div>
          <label htmlFor="fleet-view" className="block text-[10px]" style={{ color: BODY }}>
            View
          </label>
          <div className="relative mt-[8px]">
            <select
              id="fleet-view"
              value={view}
              onChange={(e) => {
                setView(e.currentTarget.value as View);
                setPage(1);
              }}
              className={`${field} cursor-pointer appearance-none pr-10`}
            >
              {(Object.entries(VIEWS) as [View, string][]).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <ChevronDown
              aria-hidden="true"
              strokeWidth={1.5}
              className="pointer-events-none absolute top-1/2 right-[14px] size-4 -translate-y-1/2 text-[#9aa0a6]"
            />
          </div>
        </div>
      </div>

      {(status.message || status.error) && (
        <Notice tone={status.error ? "error" : "success"} className="mt-[24px] lg:max-w-[965px]">
          {status.error || status.message}
        </Notice>
      )}

      <p aria-live="polite" className="sr-only">
        {list.loading
          ? "Loading yachts"
          : list.error
            ? loadError
            : `${total} ${total === 1 ? "yacht" : "yachts"} found`}
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
            <caption className="sr-only">Fleet</caption>
            <thead style={{ backgroundColor: SAND }}>
              <tr className="text-[10px] tracking-[0.08em]" style={{ color: MUTED }}>
                {["Yacht", "Ownership", "Public status", "Capacity"].map((h) => (
                  <th key={h} scope="col" className="h-[43px] w-[22%] px-[13px] font-normal">
                    {h}
                  </th>
                ))}
                <th scope="col" className="h-[43px] px-[13px] font-normal">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {list.loading && !list.data ? (
                <tr>
                  <td colSpan={5} className="h-[80px] px-[13px]" style={{ color: MUTED }}>
                    <LoadingLogo label="Loading yachts" size="compact" />
                  </td>
                </tr>
              ) : (
                yachts.map((y) => (
                  <tr
                    key={y.id}
                    className={`border-b border-[#e3e1dc] ${list.loading ? "opacity-60" : ""}`}
                  >
                    <th scope="row" className="h-[47px] px-[13px] font-normal">
                      <Link href={adminRoutes.fleetYacht(y.id)} className="hover:underline">
                        {y.name}
                      </Link>
                    </th>
                    <td className="px-[13px]">
                      <Dotted text={ownershipText(y)} />
                    </td>
                    <td className="px-[13px]">
                      <Dotted text={publicStatus(y)} />
                    </td>
                    <td className="px-[13px]">{y.capacity} guests</td>
                    <td className="px-[13px]">{actions(y)}</td>
                  </tr>
                ))
              )}
              {!list.loading && yachts.length === 0 && (
                <tr>
                  <td colSpan={5} className="h-[60px] px-[13px]" style={{ color: BODY }}>
                    {emptyText}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Phones and tablets: one card per yacht */}
          <ul aria-busy={list.loading} className="mt-[44px] flex flex-col gap-[22px] lg:hidden">
            {list.loading && !list.data && (
              <li style={{ color: MUTED }}>
                <LoadingLogo label="Loading yachts" size="compact" />
              </li>
            )}
            {yachts.map((y) => (
              <li
                key={y.id}
                className={`border border-[#e3e1dc] bg-white px-[20px] pt-[24px] pb-[20px] ${list.loading ? "opacity-60" : ""}`}
              >
                <h2 className="text-[20px] leading-[26px]">{y.name}</h2>
                <dl className="mt-[10px] text-[14px] leading-[20px]">
                  {[
                    ["Ownership", ownershipText(y)],
                    ["Public status", publicStatus(y)],
                    ["Capacity", `${y.capacity} guests`],
                  ].map(([term, value], i) => (
                    <div key={term} className={i > 0 ? "mt-[12px]" : ""}>
                      <dt className="text-[12px]" style={{ color: BODY }}>
                        {term}
                      </dt>
                      <dd className="mt-[4px]">
                        <Dotted text={value!} />
                      </dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-[14px] flex flex-wrap items-center gap-[18px]">
                  <Link
                    href={adminRoutes.fleetYacht(y.id)}
                    className={`${outlineButton} w-[128px] gap-[4px]`}
                    style={{ borderColor: INK }}
                  >
                    View details
                    <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-[11px]" />
                    <span className="sr-only">for {y.name}</span>
                  </Link>
                  {actions(y)}
                </div>
              </li>
            ))}
            {!list.loading && yachts.length === 0 && (
              <li className="text-[14px]" style={{ color: BODY }}>
                {emptyText}
              </li>
            )}
          </ul>

          {total > PAGE_SIZE && (
            <nav
              aria-label="Fleet pages"
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

      <aside
        className="mt-[22px] px-[17px] pt-[18px] pb-[20px] lg:mt-[28px]"
        style={{ backgroundColor: SAND }}
      >
        <p className="text-[10px] tracking-[0.12em] uppercase" style={{ color: MUTED }}>
          Visibility and operations
        </p>
        <p className="mt-[10px] text-[12px] leading-[18px]">
          Hiding a yacht removes it from public discovery. Deactivating stops new bookings; existing
          bookings remain in your records for follow-up.
        </p>
      </aside>
    </div>
  );
}
