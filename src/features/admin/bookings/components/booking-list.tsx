"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { BODY, GRADIENT, INK, MUTED, SAND } from "@/components/admin/admin-theme";
import { Notice, SelectBox } from "@/components/admin/form-parts";
import { LoadingLogo } from "@/components/shared/loading-logo";
import { resolveYacht, searchYachts } from "@/components/admin/lookups";
import { SearchSelect } from "@/components/admin/search-select";
import { adminRoutes } from "@/constants/routes";
import { listCancellationRequests } from "@/services/admin/cancellation-requests.service";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { useDebounced } from "@/features/admin/fleet/hooks/use-debounced";
import { cx } from "@/lib/cx";
import {
  BOOKING_STATUSES,
  downloadBookingsCsv,
  listBookings,
  type BookingExportQuery,
  type BookingListQuery,
  type BookingStatus,
  type BookingSummary,
} from "@/services/admin/bookings.service";

import {
  bookingErrorMessage,
  bookingStatusLabel,
  departureText,
  marinaToday,
  monthRange,
  monthRangeLabel,
  paymentLabel,
  shiftMonth,
} from "../utils/booking-format";
import { pagePadding, PageHeader } from "./booking-ui";

const PAGE_SIZE = 20;
const NEEDS_REVIEW = "needs_review";

const field =
  "h-[50px] w-full border border-[#d8d6d1] bg-white px-[14px] text-[14px] outline-none placeholder:text-[#0d1b2a] focus:border-[#0d1b2a] focus:placeholder:text-[#9a9da1]";
const outlineButton =
  "flex h-[48px] items-center justify-center border bg-white px-[16px] text-[11px] transition-colors hover:bg-[#f2f1ee] disabled:cursor-not-allowed disabled:opacity-60";

/** Two months back to six ahead: the departure ranges staff pick from. */
function monthOptions(today: string) {
  const current = today.slice(0, 7);
  return [-2, -1, 0, 1, 2, 3, 4, 5, 6].map((delta) => {
    const month = shiftMonth(current, delta);
    return { value: month, label: monthRangeLabel(month) };
  });
}

const customerName = (b: BookingSummary) => b.customer?.full_name ?? b.contact.full_name;

/**
 * Bookings ("Every booking, in view."), admin Figma A08: actions, filters and
 * the booking table (cards on phones). Data: GET /admin/bookings; the yacht
 * filter uses GET /admin/yachts; export uses the bookings report.
 */
export function BookingList({ customer }: { customer?: { id: string; name: string } } = {}) {
  const today = marinaToday();
  const months = monthOptions(today);

  const [query, setQuery] = useState("");
  const [month, setMonth] = useState("");
  const [yachtId, setYachtId] = useState("");
  const [state, setState] = useState("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [exportNote, setExportNote] = useState<{ tone: "success" | "error"; text: string }>();
  const search = useDebounced(query.trim());

  const range = month ? monthRange(month) : null;
  const request: BookingListQuery = {
    page,
    limit: PAGE_SIZE,
    ...(customer ? { customer_id: customer.id } : {}),
    ...(search ? { search: search.slice(0, 100) } : {}),
    ...(range ? { from: range.from, to: range.to, sort: "charter_date" as const } : {}),
    ...(yachtId ? { yacht_id: yachtId } : {}),
    ...(state === NEEDS_REVIEW
      ? { needs_review: true }
      : state
        ? { status: state as BookingStatus }
        : {}),
  };
  const list = useAdminQuery((signal) => listBookings(request, signal), JSON.stringify(request));
  // How many customer cancellation requests wait for a decision (0 when it can't be read).
  const pendingRequests = useAdminQuery(
    (signal) =>
      listCancellationRequests({ status: "pending", limit: 1 }, signal)
        .then((r) => r.total)
        .catch(() => 0),
    "pending-cancellation-count",
  );

  const filtered = Boolean(search || month || yachtId || state);
  const rows = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const first = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const last = Math.min(page * PAGE_SIZE, total);
  const loadError = list.error
    ? `Couldn't load the bookings. ${bookingErrorMessage(list.error)}`
    : "";
  const emptyText = filtered ? "No bookings match these filters." : "No bookings yet.";

  const resetPage = () => setPage(1);
  const clearFilters = () => {
    setQuery("");
    setMonth("");
    setYachtId("");
    setState("");
    setPage(1);
  };

  async function exportResults() {
    // The report needs a date range of at most 366 days: the chosen month, or
    // five months back to six ahead.
    const current = today.slice(0, 7);
    const span = range ?? {
      from: monthRange(shiftMonth(current, -5)).from,
      to: monthRange(shiftMonth(current, 6)).to,
    };
    const exportQuery: BookingExportQuery = {
      ...span,
      ...(yachtId ? { yacht_id: yachtId } : {}),
      ...(state && state !== NEEDS_REVIEW ? { status: state as BookingStatus } : {}),
    };
    setExporting(true);
    setExportNote(undefined);
    try {
      const blob = await downloadBookingsCsv(exportQuery);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bookings-${span.from}-to-${span.to}.csv`;
      document.body.append(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      const skipped = [search && "search", state === NEEDS_REVIEW && "needs review"].filter(
        Boolean,
      );
      setExportNote({
        tone: "success",
        text:
          `Exported departures from ${span.from} to ${span.to}.` +
          (skipped.length ? ` The export doesn't take the ${skipped.join(" and ")} filter.` : ""),
      });
    } catch (error) {
      setExportNote({ tone: "error", text: `Couldn't export. ${bookingErrorMessage(error)}` });
    } finally {
      setExporting(false);
    }
  }

  const stateOptions = [
    { value: "", label: "All booking / payment states" },
    ...BOOKING_STATUSES.map((s) => ({ value: s, label: bookingStatusLabel(s) })),
    { value: NEEDS_REVIEW, label: "Payment needs review" },
  ];

  return (
    <div className={pagePadding}>
      <PageHeader
        title="Every booking, in view."
        subtitle="Search, filter and manage customer charters."
      />
      {customer && (
        <p className="mt-[14px] text-[12px]" style={{ color: BODY }}>
          Showing bookings for{" "}
          <Link href={adminRoutes.customer(customer.id)} className="underline underline-offset-2">
            {customer.name || "this customer"}
          </Link>{" "}
          ·{" "}
          <Link href={adminRoutes.bookings} className="underline underline-offset-2">
            Show all bookings
          </Link>
        </p>
      )}

      <div className="mt-[20px] flex flex-col items-start gap-[14px] sm:flex-row lg:mt-[26px]">
        <Link
          href={adminRoutes.bookingNew}
          className="flex h-[48px] w-[164px] items-center justify-center text-[11px] transition-opacity hover:opacity-90"
          style={{ background: GRADIENT }}
        >
          Create office booking
        </Link>
        <button
          type="button"
          onClick={exportResults}
          disabled={exporting}
          className={`${outlineButton} w-[172px]`}
          style={{ borderColor: INK }}
        >
          {exporting ? "Exporting…" : "Export filtered results"}
        </button>
        <Link
          href={adminRoutes.cancellationRequests}
          className={`${outlineButton} min-w-[172px] gap-[6px] px-[14px]`}
          style={{ borderColor: INK }}
        >
          Cancellation requests
          {pendingRequests.data ? (
            <span
              className="inline-flex min-w-[20px] items-center justify-center rounded-full px-[6px] text-[10px] text-white"
              style={{ backgroundColor: INK }}
              aria-label={`${pendingRequests.data} awaiting a decision`}
            >
              {pendingRequests.data}
            </span>
          ) : null}
        </Link>
      </div>
      {exportNote && (
        <Notice tone={exportNote.tone} className="mt-[14px] lg:max-w-[620px]">
          {exportNote.text}
        </Notice>
      )}

      <div className="mt-[24px] grid gap-x-[18px] gap-y-[18px] lg:mt-[32px] lg:max-w-[948px] lg:grid-cols-2">
        <div>
          <label htmlFor="booking-search" className="block text-[10px]" style={{ color: BODY }}>
            Search
          </label>
          <input
            id="booking-search"
            type="search"
            value={query}
            maxLength={100}
            onChange={(e) => {
              setQuery(e.currentTarget.value);
              resetPage();
            }}
            placeholder="Booking reference, guest name or email"
            className={`${field} mt-[8px]`}
          />
        </div>
        <div>
          <label htmlFor="booking-range" className="block text-[10px]" style={{ color: BODY }}>
            Departure range
          </label>
          <div className="mt-[8px]">
            <SelectBox
              id="booking-range"
              value={month}
              onChange={(v) => {
                setMonth(v);
                resetPage();
              }}
              options={[{ value: "", label: "Any departure date" }, ...months]}
            />
          </div>
        </div>
        <div>
          <label htmlFor="booking-yacht" className="block text-[10px]" style={{ color: BODY }}>
            Yacht
          </label>
          <div className="mt-[8px]">
            <SearchSelect
              id="booking-yacht"
              value={yachtId}
              onChange={(v) => {
                setYachtId(v);
                resetPage();
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
        <div>
          <label htmlFor="booking-state" className="block text-[10px]" style={{ color: BODY }}>
            Status
          </label>
          <div className="mt-[8px]">
            <SelectBox
              id="booking-state"
              value={state}
              onChange={(v) => {
                setState(v);
                resetPage();
              }}
              options={stateOptions}
            />
          </div>
        </div>
      </div>

      <p
        aria-live="polite"
        className="mt-[32px] text-[10px] tracking-[0.12em] uppercase lg:mt-[40px]"
        style={{ color: MUTED }}
      >
        {list.loading && !list.data
          ? "Loading bookings"
          : list.error
            ? "Bookings unavailable"
            : `${total} ${total === 1 ? "booking" : "bookings"} · ${filtered ? "filters applied" : "all bookings"}`}
      </p>

      {list.error && !list.loading ? (
        <div role="alert" className="mt-[24px] flex flex-col items-start gap-[14px]">
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
            className="mt-[18px] hidden w-full border-collapse text-left text-[12px] lg:table"
          >
            <caption className="sr-only">Bookings</caption>
            <thead style={{ backgroundColor: SAND }}>
              <tr className="text-[10px] tracking-[0.04em]" style={{ color: MUTED }}>
                {["Reference / customer", "Departure", "Yacht", "Payment", "Booking"].map(
                  (h, i) => (
                    <th
                      key={h}
                      scope="col"
                      className={cx(
                        "h-[43px] px-[13px] font-normal",
                        i === 0 ? "w-[28%]" : "w-[18%]",
                      )}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="bg-white">
              {list.loading && !list.data ? (
                <tr>
                  <td colSpan={5} className="h-[80px] px-[13px]" style={{ color: MUTED }}>
                    <LoadingLogo label="Loading bookings" size="compact" />
                  </td>
                </tr>
              ) : (
                rows.map((b) => (
                  <tr
                    key={b.id}
                    className={cx("border-b border-[#e3e1dc]", list.loading && "opacity-60")}
                  >
                    <th scope="row" className="h-[47px] px-[13px] font-normal">
                      <Link href={adminRoutes.booking(b.id)} className="hover:underline">
                        {b.reference} · {customerName(b)}
                      </Link>
                    </th>
                    <td className="px-[13px]">{departureText(b)}</td>
                    <td className="px-[13px]">{b.yacht.name}</td>
                    <td className="px-[13px]">{paymentLabel(b)}</td>
                    <td className="px-[13px]">{bookingStatusLabel(b.status)}</td>
                  </tr>
                ))
              )}
              {!list.loading && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="h-[60px] px-[13px]" style={{ color: BODY }}>
                    {emptyText}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Phones and tablets: one card per booking */}
          <ul aria-busy={list.loading} className="mt-[18px] flex flex-col gap-[22px] lg:hidden">
            {list.loading && !list.data && (
              <li style={{ color: MUTED }}>
                <LoadingLogo label="Loading bookings" size="compact" />
              </li>
            )}
            {rows.map((b) => (
              <li
                key={b.id}
                className={cx(
                  "border border-[#e3e1dc] bg-white px-[20px] pt-[24px] pb-[20px]",
                  list.loading && "opacity-60",
                )}
              >
                <h2 className="text-[20px] leading-[26px]">
                  {b.reference} · {customerName(b)}
                </h2>
                <dl className="mt-[10px] text-[14px] leading-[20px]">
                  {[
                    ["Departure", departureText(b)],
                    ["Yacht", b.yacht.name],
                    ["Payment", paymentLabel(b)],
                    ["Booking", bookingStatusLabel(b.status)],
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
                  href={adminRoutes.booking(b.id)}
                  className={`${outlineButton} mt-[14px] w-[128px] gap-[4px]`}
                  style={{ borderColor: INK }}
                >
                  View details
                  <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-[11px]" />
                  <span className="sr-only">for {b.reference}</span>
                </Link>
              </li>
            ))}
            {!list.loading && rows.length === 0 && (
              <li className="text-[14px]" style={{ color: BODY }}>
                {emptyText}
              </li>
            )}
          </ul>

          <div className="mt-[22px] flex flex-wrap items-center gap-[14px] text-[12px]">
            {total > PAGE_SIZE && (
              <nav aria-label="Booking pages" className="flex flex-wrap items-center gap-[14px]">
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
            {filtered && (
              <button
                type="button"
                onClick={clearFilters}
                className="h-[40px] px-[22px] text-[11px] hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
