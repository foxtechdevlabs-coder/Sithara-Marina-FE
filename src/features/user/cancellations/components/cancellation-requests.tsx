"use client";

import { useState } from "react";

import { Loading, Notice, textLinkClass } from "@/features/user/checkout/components/checkout-ui";
import {
  AccountPage,
  DetailGrid,
  Pagination,
  StatusPill,
} from "@/features/user/profile/components/account-ui";
import { accountErrorMessage } from "@/features/user/profile/utils/account-error-message";
import {
  formatClockTime,
  formatDateTime,
  formatDay,
  formatMinorUnits,
} from "@/features/user/yachts/utils/yacht-view";
import { useApiQuery } from "@/hooks/use-api-query";
import { cx } from "@/lib/cx";
import {
  getCancellationRequests,
  type CancellationRequest,
  type CancellationStatus,
} from "@/services/user/cancellations.service";

import { REFUND_DECISION, REQUEST_STATUS } from "./cancellation-labels";

const PAGE_SIZE = 10;

const FILTERS: { label: string; value: CancellationStatus | null }[] = [
  { label: "All", value: null },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
];

/** The customer's cancellation requests, filtered and paged by the backend. */
export function CancellationRequests() {
  const [status, setStatus] = useState<CancellationStatus | null>(null);
  const [page, setPage] = useState(1);
  const list = useApiQuery(
    (signal) =>
      getCancellationRequests(
        { page, limit: PAGE_SIZE, ...(status ? { status } : {}) },
        signal,
      ),
    `${status ?? "all"}|${page}`,
  );
  const data = list.data;

  return (
    <AccountPage
      heading="Cancellation"
      headingSerif="requests."
      intro="Requests you’ve sent, and our team’s decisions."
    >
      <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-[8px]">
        {FILTERS.map((filter) => {
          const active = filter.value === status;
          return (
            <button
              key={filter.label}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setStatus(filter.value);
                setPage(1);
              }}
              className={cx(
                "min-h-[40px] border px-[16px] text-[13px] transition-colors",
                active
                  ? "border-[#0d1b2a] bg-[#0d1b2a] text-white"
                  : "border-[#dfe2e6] hover:border-[#0d1b2a]",
              )}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      <div className="mt-[28px]" aria-busy={list.loading}>
        {list.loading && !data ? (
          <Loading label="Loading your cancellation requests" />
        ) : list.error && !data ? (
          <Notice alert>
            {accountErrorMessage(list.error, "We couldn’t load your cancellation requests.")}{" "}
            <button type="button" className={textLinkClass} onClick={list.reload}>
              Try again
            </button>
          </Notice>
        ) : data && data.items.length === 0 ? (
          <Notice>
            {status
              ? `You have no ${FILTERS.find((f) => f.value === status)?.label.toLowerCase()} cancellation requests.`
              : "You haven’t requested any cancellations."}
          </Notice>
        ) : data ? (
          <>
            {list.loading && <Loading label="Updating" />}
            <ul className={cx("grid gap-[20px]", list.loading && "opacity-60")}>
              {data.items.map((item) => (
                <RequestCard key={item.id} request={item} />
              ))}
            </ul>
            <Pagination
              page={data.page}
              limit={data.limit}
              total={data.total}
              onPage={setPage}
              disabled={list.loading}
            />
          </>
        ) : null}
      </div>
    </AccountPage>
  );
}

function RequestCard({ request }: { request: CancellationRequest }) {
  const status = REQUEST_STATUS[request.status];
  const { booking } = request;
  const times =
    booking.start_time && booking.end_time
      ? `${formatClockTime(booking.start_time)} – ${formatClockTime(booking.end_time)}`
      : null;
  return (
    <li className="border border-[#e3e5e8] p-[20px] sm:p-[28px]">
      <div className="flex flex-wrap items-start justify-between gap-[12px]">
        <div className="min-w-0">
          <p className="text-[11px] tracking-[0.16em] text-[#7a7f85] uppercase">
            Booking {request.booking_reference}
          </p>
          <p className="mt-[6px] text-[22px] leading-[28px] break-words">{booking.yacht_name}</p>
          <p className="mt-[2px] text-[14px] text-[#4a4f55]">
            {booking.date ? formatDay(booking.date) : formatDateTime(booking.starts_at)}
            {times ? ` · ${times}` : ""}
          </p>
        </div>
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
      </div>
      <div className="mt-[20px]">
        <DetailGrid
          items={[
            { label: "Requested", value: formatDateTime(request.requested_at) },
            ...(request.decided_at
              ? [{ label: "Decided", value: formatDateTime(request.decided_at) }]
              : []),
            {
              label: "Refund decision",
              value: request.refund_decision
                ? REFUND_DECISION[request.refund_decision]
                : "Not decided yet",
            },
            ...(request.refund_amount !== null
              ? [
                  {
                    label: "Refund amount",
                    value: formatMinorUnits(request.refund_amount, request.currency) ?? "",
                  },
                ]
              : []),
          ]}
        />
      </div>
      {request.reason && (
        <p className="mt-[16px] text-[15px] leading-[24px] break-words">
          <span className="text-[#7a7f85]">Your reason: </span>
          {request.reason}
        </p>
      )}
      {request.decision_reason && (
        <p className="mt-[8px] text-[15px] leading-[24px] break-words">
          <span className="text-[#7a7f85]">Our team’s note: </span>
          {request.decision_reason}
        </p>
      )}
    </li>
  );
}
