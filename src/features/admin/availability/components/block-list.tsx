"use client";

import Link from "next/link";
import { useState } from "react";

import { BODY, SAND } from "@/components/admin/admin-theme";
import {
  Label,
  LoadState,
  OUTLINE_STYLE,
  PRIMARY_STYLE,
  SelectBox,
} from "@/components/admin/form-parts";
import { resolveYacht, searchYachts } from "@/components/admin/lookups";
import { SearchSelect } from "@/components/admin/search-select";
import { adminRoutes } from "@/constants/routes";
import {
  PageHeader,
  pagePadding,
  SegmentTabs,
  smallOutline,
  smallPrimary,
} from "@/features/admin/bookings/components/booking-ui";
import { MARINA_TIME_ZONE } from "@/features/admin/bookings/utils/booking-format";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { cx } from "@/lib/cx";
import { listAvailabilityBlocks, type BlockReason } from "@/services/admin/availability.service";

import {
  availabilityErrorMessage,
  BLOCK_REASON_OPTIONS,
  blockReasonLabel,
  instantText,
} from "../utils/availability-format";

const PAGE_SIZE = 20;

/** Every availability block, upcoming first (GET /admin/availability-blocks). */
export function BlockList() {
  const [now] = useState(() => new Date().toISOString());
  const [scope, setScope] = useState<"upcoming" | "all">("upcoming");
  const [yachtId, setYachtId] = useState("");
  const [reason, setReason] = useState<BlockReason | "">("");
  const [page, setPage] = useState(1);

  const blocks = useAdminQuery(
    (signal) =>
      listAvailabilityBlocks(
        {
          page,
          limit: PAGE_SIZE,
          ...(yachtId ? { yacht_id: yachtId } : {}),
          ...(reason ? { reason } : {}),
          ...(scope === "upcoming" ? { from: now } : {}),
        },
        signal,
      ),
    `blocks:${scope}:${yachtId}:${reason}:${page}`,
  );
  const items = [...(blocks.data?.items ?? [])].sort((a, b) =>
    a.starts_at.localeCompare(b.starts_at),
  );
  const total = blocks.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className={pagePadding}>
      <PageHeader
        title="Time set aside."
        subtitle="Maintenance, private use and other blocks. A blocked time can’t be booked."
      />

      <div className="mt-[24px] flex flex-wrap gap-[14px] lg:mt-[30px]">
        <Link
          href={adminRoutes.availabilityBlockNew(yachtId)}
          className={cx(smallPrimary, "min-w-[118px]")}
          style={PRIMARY_STYLE}
        >
          Block a time
        </Link>
        <Link
          href={adminRoutes.blockBatchNew}
          className={cx(smallOutline, "min-w-[118px]")}
          style={OUTLINE_STYLE}
        >
          Block several yachts
        </Link>
        <Link
          href={adminRoutes.availabilityFor(yachtId)}
          className={cx(smallOutline, "min-w-[118px]")}
          style={OUTLINE_STYLE}
        >
          Calendar
        </Link>
      </div>

      <div className="mt-[24px]">
        <SegmentTabs
          label="Which blocks"
          value={scope}
          onChange={(v) => {
            setScope(v);
            setPage(1);
          }}
          options={[
            { value: "upcoming", label: "Upcoming" },
            { value: "all", label: "All" },
          ]}
        />
      </div>

      <div className="mt-[20px] grid gap-x-[18px] gap-y-[20px] lg:max-w-[580px] lg:grid-cols-2">
        <div>
          <Label htmlFor="blocks-yacht">Yacht</Label>
          <SearchSelect
            id="blocks-yacht"
            value={yachtId}
            onChange={(v) => {
              setYachtId(v);
              setPage(1);
            }}
            load={searchYachts()}
            resolve={resolveYacht}
            clearable
            emptyLabel="All yachts"
            placeholder="Search yachts by name"
            noResults="No yacht matches."
          />
        </div>
        <div>
          <Label htmlFor="blocks-reason">Reason</Label>
          <SelectBox
            id="blocks-reason"
            value={reason}
            onChange={(v) => {
              setReason(v as BlockReason | "");
              setPage(1);
            }}
            options={[{ value: "", label: "All reasons" }, ...BLOCK_REASON_OPTIONS]}
          />
        </div>
      </div>

      <div className="mt-[24px] lg:max-w-[880px]">
        {!blocks.data ? (
          <LoadState
            loading={blocks.loading}
            error={
              blocks.error
                ? `Couldn't load blocks. ${availabilityErrorMessage(blocks.error)}`
                : undefined
            }
            onRetry={blocks.reload}
            label="Loading blocks"
          />
        ) : !items.length ? (
          <p className="text-[13px]" style={{ color: BODY }}>
            {scope === "upcoming" ? "No upcoming blocks" : "No blocks"}
            {yachtId || reason ? " match these filters." : "."}
          </p>
        ) : (
          <>
            <table
              className={cx(
                "hidden w-full border-collapse text-left text-[11px] lg:table",
                blocks.loading && "opacity-60",
              )}
            >
              <caption className="sr-only">Availability blocks</caption>
              <thead>
                <tr style={{ backgroundColor: SAND }}>
                  {["Yacht", "Start", "End", "Reason", "Note", ""].map((h, i) => (
                    <th
                      key={i}
                      scope="col"
                      className="px-[12px] py-[10px] font-normal"
                      style={{ color: BODY }}
                    >
                      {h || <span className="sr-only">Actions</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white">
                {items.map((b) => (
                  <tr key={b.id} className="border-b border-[#ebe9e4]">
                    <td className="px-[12px] py-[11px]">{b.yacht.name}</td>
                    <td className="px-[12px] py-[11px]">
                      {instantText(b.starts_at, MARINA_TIME_ZONE)}
                    </td>
                    <td className="px-[12px] py-[11px]">
                      {instantText(b.ends_at, MARINA_TIME_ZONE)}
                    </td>
                    <td className="px-[12px] py-[11px]">
                      {blockReasonLabel(b.reason)}
                      {b.batch_id && (
                        <span
                          className="ml-[6px] px-[6px] py-[1px] text-[10px]"
                          style={{ backgroundColor: SAND }}
                        >
                          Bulk
                        </span>
                      )}
                    </td>
                    <td className="max-w-[200px] truncate px-[12px] py-[11px]" title={b.note ?? ""}>
                      {b.note || "—"}
                    </td>
                    <td className="px-[12px] py-[11px] text-right">
                      <Link
                        href={adminRoutes.availabilityBlock(b.id)}
                        className="underline underline-offset-2"
                      >
                        Edit<span className="sr-only"> block on {b.yacht.name}</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className={cx("grid gap-[14px] lg:hidden", blocks.loading && "opacity-60")}>
              {items.map((b) => (
                <li key={b.id} className="border border-[#dcdad5] bg-white px-[16px] py-[18px]">
                  <p className="text-[18px] leading-[24px]">{b.yacht.name}</p>
                  <p className="mt-[4px] text-[12px]">
                    {blockReasonLabel(b.reason)}
                    {b.batch_id ? " · bulk block" : ""}
                  </p>
                  <p className="mt-[12px] text-[10px]" style={{ color: BODY }}>
                    From
                  </p>
                  <p className="text-[12px]">{instantText(b.starts_at, MARINA_TIME_ZONE)}</p>
                  <p className="mt-[10px] text-[10px]" style={{ color: BODY }}>
                    Until
                  </p>
                  <p className="text-[12px]">{instantText(b.ends_at, MARINA_TIME_ZONE)}</p>
                  {b.note && (
                    <p className="mt-[10px] text-[12px] break-words" style={{ color: BODY }}>
                      {b.note}
                    </p>
                  )}
                  <Link
                    href={adminRoutes.availabilityBlock(b.id)}
                    className={cx(smallOutline, "mt-[14px] h-[36px] w-fit")}
                    style={OUTLINE_STYLE}
                  >
                    Edit block →
                  </Link>
                </li>
              ))}
            </ul>

            {pages > 1 && (
              <div className="mt-[20px] flex items-center gap-[12px] text-[12px]">
                <button
                  type="button"
                  disabled={page <= 1 || blocks.loading}
                  onClick={() => setPage(page - 1)}
                  className={smallOutline}
                  style={OUTLINE_STYLE}
                >
                  Previous
                </button>
                <span style={{ color: BODY }}>
                  Page {page} of {pages}
                </span>
                <button
                  type="button"
                  disabled={page >= pages || blocks.loading}
                  onClick={() => setPage(page + 1)}
                  className={smallOutline}
                  style={OUTLINE_STYLE}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
