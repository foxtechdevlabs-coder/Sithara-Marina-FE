"use client";

import { ArrowRight, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { adminRoutes } from "@/constants/routes";

import { BODY, GRADIENT, INK, MUTED, SAND } from "./admin-theme";
import { FLEET } from "./fleet-data";

/* ------------------------------------------------------------------ */
/* Rows from the shared DUMMY fleet (fleet-data.ts).                    */
/* ------------------------------------------------------------------ */

interface FleetYacht {
  id: string;
  name: string;
  /** Searchable regions and home port (not shown in the table). */
  regions: string[];
  ownership: string;
  visibility: "visible" | "hidden";
  active: boolean;
  guests: number;
}

const ROWS: FleetYacht[] = FLEET.map(({ id, form }) => ({
  id,
  name: form.name,
  regions: [...form.regions, form.port],
  ownership:
    form.ownership === "owned" ? "Owned" : form.partner ? `Partner · ${form.partner}` : "Partner",
  visibility: form.visible ? "visible" : "hidden",
  active: form.status === "Active",
  guests: Number(form.guests),
}));

const VIEWS = {
  all: "All · Active / Hidden / Inactive",
  active: "Active (visible)",
  hidden: "Hidden",
  inactive: "Inactive",
} as const;
type View = keyof typeof VIEWS;

/* ------------------------------------------------------------------ */

const publicStatus = (y: FleetYacht) =>
  y.active ? `${y.visibility === "visible" ? "Visible" : "Hidden"} · Active` : "Inactive";

function matchesView(y: FleetYacht, view: View) {
  if (view === "active") return y.active && y.visibility === "visible";
  if (view === "hidden") return y.active && y.visibility === "hidden";
  if (view === "inactive") return !y.active;
  return true;
}

/** "Partner · Coastal Co." with a spaced dot, as in the design. */
function Dotted({ text }: { text: string }) {
  const parts = text.split(" · ");
  return (
    <>
      {parts.map((part, i) => (
        <span key={part}>
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
  "flex h-[48px] items-center justify-center border bg-white text-[11px] transition-colors hover:bg-[#f2f1ee]";

/**
 * Yacht management ("The fleet, considered."), built from the admin Figma
 * design: actions, search and view filters, the fleet table (cards on
 * phones) and a note on visibility. Renders dummy data until the API exists.
 */
export default function YachtManagement({ fleet = ROWS }: { fleet?: FleetYacht[] }) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("all");

  const yachts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return fleet.filter(
      (y) =>
        matchesView(y, view) &&
        (!q ||
          y.name.toLowerCase().includes(q) ||
          y.regions.some((r) => r.toLowerCase().includes(q))),
    );
  }, [fleet, query, view]);

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
            onChange={(e) => setQuery(e.currentTarget.value)}
            placeholder="Name or region"
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
              onChange={(e) => setView(e.currentTarget.value as View)}
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

      <p aria-live="polite" className="sr-only">
        {`${yachts.length} ${yachts.length === 1 ? "yacht" : "yachts"} shown`}
      </p>

      {/* Desktop: table */}
      <table className="mt-[50px] hidden w-full border-collapse text-left text-[12px] lg:table">
        <caption className="sr-only">Fleet</caption>
        <thead style={{ backgroundColor: SAND }}>
          <tr className="text-[10px] tracking-[0.08em]" style={{ color: MUTED }}>
            {["Yacht", "Ownership", "Public status", "Capacity"].map((h) => (
              <th key={h} scope="col" className="h-[43px] w-1/4 px-[13px] font-normal">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white">
          {yachts.map((y) => (
            <tr key={y.id} className="border-b border-[#e3e1dc]">
              <th scope="row" className="h-[47px] px-[13px] font-normal">
                <Link href={adminRoutes.fleetYacht(y.id)} className="hover:underline">
                  {y.name}
                </Link>
              </th>
              <td className="px-[13px]">
                <Dotted text={y.ownership} />
              </td>
              <td className="px-[13px]">
                <Dotted text={publicStatus(y)} />
              </td>
              <td className="px-[13px]">{y.guests} guests</td>
            </tr>
          ))}
          {yachts.length === 0 && (
            <tr>
              <td colSpan={4} className="h-[60px] px-[13px]" style={{ color: BODY }}>
                No yachts match this search.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Phones and tablets: one card per yacht */}
      <ul className="mt-[44px] flex flex-col gap-[22px] lg:hidden">
        {yachts.map((y) => (
          <li key={y.id} className="border border-[#e3e1dc] bg-white px-[20px] pt-[24px] pb-[20px]">
            <h2 className="text-[20px] leading-[26px]">{y.name}</h2>
            <dl className="mt-[10px] text-[14px] leading-[20px]">
              {[
                ["Ownership", y.ownership],
                ["Public status", publicStatus(y)],
                ["Capacity", `${y.guests} guests`],
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
            <Link
              href={adminRoutes.fleetYacht(y.id)}
              className={`${outlineButton} mt-[14px] w-[128px] gap-[4px]`}
              style={{ borderColor: INK }}
            >
              View details
              <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-[11px]" />
              <span className="sr-only">for {y.name}</span>
            </Link>
          </li>
        ))}
        {yachts.length === 0 && (
          <li className="text-[14px]" style={{ color: BODY }}>
            No yachts match this search.
          </li>
        )}
      </ul>

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
