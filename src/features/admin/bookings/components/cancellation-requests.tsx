"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { BODY, SAND } from "@/components/admin/admin-theme";
import { input, LoadState, OUTLINE_STYLE } from "@/components/admin/form-parts";
import { resolveYacht, searchYachts } from "@/components/admin/lookups";
import { SearchSelect } from "@/components/admin/search-select";
import { adminRoutes } from "@/constants/routes";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { useDebounced } from "@/features/admin/fleet/hooks/use-debounced";
import { Pager } from "@/features/admin/reports/components/report-parts";
import { cx } from "@/lib/cx";
import {
  listCancellationRequests,
  type CancellationRequest,
  type CancellationRequestQuery,
} from "@/services/admin/cancellation-requests.service";

import {
  bookingErrorMessage,
  formatInstant,
  formatRupees,
  shortDate,
} from "../utils/booking-format";
import { InfoPanel, PageHeader, pagePadding, SegmentTabs, smallOutline } from "./booking-ui";

type Status = "pending" | "approved" | "rejected" | "all";
const PAGE_SIZE = 20;

const STATUS_LABEL: Record<string, string> = {
  pending: "Awaiting decision",
  approved: "Approved",
  rejected: "Declined",
};
export const requestStatusLabel = (status: string) => STATUS_LABEL[status] ?? status;

/** "12 Nov · 09:00–13:00", from the request's booking. */
export const charterText = (b: CancellationRequest["booking"]) =>
  `${b.date ? shortDate(b.date) : formatInstant(b.starts_at)}${b.start_time ? ` · ${b.start_time}${b.end_time ? `–${b.end_time}` : ""}` : ""}`;

/** Cancellation requests from customers (GET /admin/cancellation-requests). */
export function CancellationRequests() {
  const searchId = useId();
  const [status, setStatus] = useState<Status>("pending");
  const [query, setQuery] = useState("");
  const [yachtId, setYachtId] = useState("");
  const [page, setPage] = useState(1);
  const search = useDebounced(query.trim());

  const request: CancellationRequestQuery = {
    page,
    limit: PAGE_SIZE,
    // Work through pending requests oldest first; history newest first.
    sort: status === "pending" ? "oldest" : "newest",
    ...(status !== "all" ? { status } : {}),
    ...(yachtId ? { yacht_id: yachtId } : {}),
    ...(search ? { search: search.slice(0, 100) } : {}),
  };
  const list = useAdminQuery(
    (signal) => listCancellationRequests(request, signal),
    `cancel-requests:${JSON.stringify(request)}`,
  );
  const rows = list.data?.items ?? [];
  const reset = () => setPage(1);

  return (
    <div className={pagePadding}>
      <PageHeader
        title="Changes of plan, decided."
        subtitle="Customers’ cancellation requests: approve with a refund decision, or decline with a reason."
      />

      <div className="mt-[24px] lg:mt-[30px]">
        <SegmentTabs
          label="Request status"
          value={status}
          onChange={(v) => {
            setStatus(v);
            reset();
          }}
          options={[
            { value: "pending", label: "Awaiting" },
            { value: "approved", label: "Approved" },
            { value: "rejected", label: "Declined" },
            { value: "all", label: "All" },
          ]}
        />
      </div>

      <div className="mt-[20px] grid gap-x-[16px] gap-y-[18px] lg:max-w-[700px] lg:grid-cols-2">
        <div>
          <label htmlFor={searchId} className="block text-[10px]" style={{ color: BODY }}>
            Search
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            maxLength={100}
            onChange={(e) => {
              setQuery(e.currentTarget.value);
              reset();
            }}
            placeholder="Booking reference, name, email or phone"
            className={cx(input, "mt-[8px]")}
          />
        </div>
        <div>
          <label htmlFor="cr-yacht" className="block text-[10px]" style={{ color: BODY }}>
            Yacht
          </label>
          <div className="mt-[8px]">
            <SearchSelect
              id="cr-yacht"
              value={yachtId}
              onChange={(v) => {
                setYachtId(v);
                reset();
              }}
              load={searchYachts()}
              resolve={resolveYacht}
              clearable
              emptyLabel="All yachts"
              placeholder="Search yachts by name"
              noResults="No yacht matches."
            />
          </div>
        </div>
      </div>

      <div className="mt-[24px]">
        {!list.data ? (
          <LoadState
            loading={list.loading}
            error={
              list.error ? `Couldn't load requests. ${bookingErrorMessage(list.error)}` : undefined
            }
            onRetry={list.reload}
            label="Loading requests"
          />
        ) : !rows.length ? (
          <p className="text-[13px]" style={{ color: BODY }}>
            {status === "pending" && !search && !yachtId
              ? "No requests are waiting for a decision."
              : "No requests match these filters."}
          </p>
        ) : (
          <div className={cx(list.loading && "opacity-60")}>
            <table className="hidden w-full border-collapse text-left text-[11px] lg:table">
              <caption className="sr-only">Cancellation requests</caption>
              <thead>
                <tr style={{ backgroundColor: SAND }}>
                  {["Booking", "Customer", "Charter", "Total", "Requested", "Status"].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="px-[12px] py-[12px] font-normal"
                      style={{ color: BODY }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white">
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-[#ebe9e4]">
                    <td className="px-[12px] py-[12px]">
                      <Link
                        href={adminRoutes.cancellationRequest(r.id)}
                        className="underline-offset-2 hover:underline"
                      >
                        {r.booking.reference}
                      </Link>
                    </td>
                    <td className="max-w-[200px] px-[12px] py-[12px] break-words">
                      {r.booking.contact_name}
                    </td>
                    <td className="px-[12px] py-[12px]">
                      <span className="break-words">{r.booking.yacht_name}</span>
                      <span className="block text-[10px]" style={{ color: BODY }}>
                        {charterText(r.booking)}
                      </span>
                    </td>
                    <td className="px-[12px] py-[12px] tabular-nums">
                      {formatRupees(r.booking.total_amount)}
                    </td>
                    <td className="px-[12px] py-[12px]">{formatInstant(r.requested_at)}</td>
                    <td className="px-[12px] py-[12px]">{requestStatusLabel(r.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <ul className="grid gap-[12px] lg:hidden">
              {rows.map((r) => (
                <li key={r.id} className="border border-[#dcdad5] bg-white px-[16px] py-[16px]">
                  <p className="text-[16px]">
                    {r.booking.reference} · {requestStatusLabel(r.status)}
                  </p>
                  <p className="mt-[4px] text-[12px] break-words" style={{ color: BODY }}>
                    {r.booking.contact_name} · {r.booking.yacht_name} · {charterText(r.booking)}
                  </p>
                  <p className="mt-[4px] text-[12px]" style={{ color: BODY }}>
                    Requested {formatInstant(r.requested_at)}
                  </p>
                  <Link
                    href={adminRoutes.cancellationRequest(r.id)}
                    className={cx(smallOutline, "mt-[12px] h-[36px] w-fit")}
                    style={OUTLINE_STYLE}
                  >
                    {r.status === "pending" ? "Decide →" : "View →"}
                  </Link>
                </li>
              ))}
            </ul>
            <Pager
              page={page}
              total={list.data.total}
              limit={PAGE_SIZE}
              busy={list.loading}
              onPage={setPage}
            />
          </div>
        )}
      </div>

      <InfoPanel title="Deciding a request" className="mt-[24px]">
        Approving cancels the booking and records the refund owed; the refund itself is paid on
        Payments & refunds. A decline keeps the booking. Either way the customer sees your reason.
      </InfoPanel>
    </div>
  );
}
