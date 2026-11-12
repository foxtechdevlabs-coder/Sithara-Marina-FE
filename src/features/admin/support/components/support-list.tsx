"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { BODY, MUTED, SAND } from "@/components/admin/admin-theme";
import { input, Label, LoadState, OUTLINE_STYLE, SelectBox } from "@/components/admin/form-parts";
import { adminRoutes } from "@/constants/routes";
import {
  PageHeader,
  pagePadding,
  smallOutline,
} from "@/features/admin/bookings/components/booking-ui";
import { formatInstant } from "@/features/admin/bookings/utils/booking-format";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { useDebounced } from "@/features/admin/fleet/hooks/use-debounced";
import { Pager } from "@/features/admin/reports/components/report-parts";
import { cx } from "@/lib/cx";
import {
  listSupportRequests,
  SUPPORT_CATEGORIES,
  type SupportCategory,
  type SupportQuery,
  type SupportRequest,
} from "@/services/admin/support.service";

import { categoryLabel, messagePreview, supportErrorMessage } from "../utils/support-format";

const PAGE_SIZE = 20;
const card = "border border-[#e3e1dc] bg-white px-[20px] pt-[20px] pb-[18px]";

function Tile({ title, caption, value }: { title: string; caption: string; value: string }) {
  return (
    <div className={card}>
      <h2 className="text-[18px] leading-[24px] lg:text-[20px]">{title}</h2>
      <p className="mt-[6px] text-[12px]" style={{ color: BODY }}>
        {caption}
      </p>
      <p className="mt-[12px] text-[28px] leading-[34px]">{value}</p>
    </div>
  );
}

function Category({ value }: { value: string | null }) {
  return (
    <span className="inline-block px-[6px] py-[1px] text-[10px]" style={{ backgroundColor: SAND }}>
      {categoryLabel(value)}
    </span>
  );
}

const countOf = (category?: SupportCategory) => (signal: AbortSignal) =>
  listSupportRequests({ limit: 1, ...(category ? { category } : {}) }, signal).then((r) => r.total);

/** Support: customer support requests (GET /admin/support-requests). Read-only; replies go by email. */
export function SupportList() {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"" | SupportCategory>("");
  const [page, setPage] = useState(1);
  const search = useDebounced(query.trim());

  const request: SupportQuery = {
    page,
    limit: PAGE_SIZE,
    ...(category ? { category } : {}),
    ...(search ? { search: search.slice(0, 100) } : {}),
  };
  const list = useAdminQuery(
    (signal) => listSupportRequests(request, signal),
    `support:${JSON.stringify(request)}`,
  );
  const all = useAdminQuery(countOf(), "support-count:all");
  const bookings = useAdminQuery(countOf("booking"), "support-count:booking");
  const money = useAdminQuery(
    (signal) =>
      Promise.all([countOf("payment")(signal), countOf("refund")(signal)]).then(([a, b]) => a + b),
    "support-count:money",
  );
  const tile = (q: { data?: number; error?: unknown }) =>
    q.data === undefined || q.error ? "—" : q.data.toLocaleString("en-IN");
  const rows = list.data?.items ?? [];

  const facts = (r: SupportRequest): [string, string][] => [
    ["Customer", `${r.customer.name} · ${r.customer.email}`],
    ["Booking", r.booking_reference ?? "Not linked"],
    ["Received", formatInstant(r.created_at)],
  ];

  return (
    <div className={pagePadding}>
      <PageHeader title="Every question, answered." subtitle="Customer support requests." />

      <div className="mt-[24px] grid gap-x-[18px] gap-y-[18px] lg:mt-[30px] lg:max-w-[580px] lg:grid-cols-2">
        <div>
          <Label htmlFor={searchId}>Search requests</Label>
          <input
            id={searchId}
            type="search"
            value={query}
            maxLength={100}
            onChange={(e) => {
              setQuery(e.currentTarget.value);
              setPage(1);
            }}
            placeholder="Reference, subject, customer or email"
            className={input}
          />
        </div>
        <div>
          <Label htmlFor="support-category">Category</Label>
          <SelectBox
            id="support-category"
            value={category}
            onChange={(v) => {
              setCategory(v as "" | SupportCategory);
              setPage(1);
            }}
            options={[
              { value: "", label: "All categories" },
              ...SUPPORT_CATEGORIES.map((c) => ({ value: c, label: categoryLabel(c) })),
            ]}
          />
        </div>
      </div>

      <div className="mt-[26px] grid gap-[14px] lg:grid-cols-3 lg:gap-[16px]">
        <Tile title="All requests" caption="Sent by customers" value={tile(all)} />
        <Tile title="Bookings" caption="Questions about a booking" value={tile(bookings)} />
        <Tile title="Payments & refunds" caption="Money questions" value={tile(money)} />
      </div>

      <div className="mt-[24px]">
        {!list.data ? (
          <LoadState
            loading={list.loading}
            error={
              list.error
                ? `Couldn't load support requests. ${supportErrorMessage(list.error)}`
                : undefined
            }
            onRetry={list.reload}
            label="Loading support requests"
          />
        ) : !rows.length ? (
          <p className="text-[13px]" style={{ color: BODY }}>
            {search || category ? "No requests match these filters." : "No support requests yet."}
          </p>
        ) : (
          <div className={cx(list.loading && "opacity-60")}>
            <table className="hidden w-full table-fixed border-collapse text-left text-[11px] lg:table">
              <caption className="sr-only">Support requests</caption>
              <thead>
                <tr style={{ backgroundColor: SAND }}>
                  {(
                    [
                      ["Request", "w-[16%]"],
                      ["Subject", "w-[36%]"],
                      ["Customer", "w-[22%]"],
                      ["Booking", "w-[12%]"],
                      ["Received", "w-[14%]"],
                    ] as const
                  ).map(([h, w]) => (
                    <th
                      key={h}
                      scope="col"
                      className={cx(w, "px-[12px] py-[12px] font-normal")}
                      style={{ color: BODY }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white">
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-[#ebe9e4] align-top">
                    <td className="px-[12px] py-[12px]">
                      <Link
                        href={adminRoutes.supportRequest(r.id)}
                        className="underline-offset-2 hover:underline"
                      >
                        {r.reference}
                      </Link>
                      <div className="mt-[6px]">
                        <Category value={r.category} />
                      </div>
                    </td>
                    <td className="px-[12px] py-[12px]">
                      <p className="text-[12px] break-words">{r.subject}</p>
                      <p className="mt-[4px] break-words" style={{ color: MUTED }}>
                        {messagePreview(r.message, 110)}
                      </p>
                    </td>
                    <td className="px-[12px] py-[12px] break-words">
                      {r.customer.name}
                      <span className="block" style={{ color: MUTED }}>
                        {r.customer.email}
                      </span>
                    </td>
                    <td className="px-[12px] py-[12px]">
                      {r.booking_id && r.booking_reference ? (
                        <Link
                          href={adminRoutes.booking(r.booking_id)}
                          className="underline underline-offset-2"
                        >
                          {r.booking_reference}
                        </Link>
                      ) : (
                        (r.booking_reference ?? "—")
                      )}
                    </td>
                    <td className="px-[12px] py-[12px]">{formatInstant(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="grid gap-[14px] lg:hidden">
              {rows.map((r) => (
                <li key={r.id} className={card}>
                  <div className="flex flex-wrap items-center justify-between gap-[8px]">
                    <p className="text-[18px] leading-[24px]">{r.reference}</p>
                    <Category value={r.category} />
                  </div>
                  <p className="mt-[8px] text-[14px] break-words">{r.subject}</p>
                  <p className="mt-[4px] text-[12px] break-words" style={{ color: MUTED }}>
                    {messagePreview(r.message)}
                  </p>
                  <dl className="text-[13px]">
                    {facts(r).map(([t, v]) => (
                      <div key={t} className="mt-[10px]">
                        <dt className="text-[11px]" style={{ color: BODY }}>
                          {t}
                        </dt>
                        <dd className="break-words">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <Link
                    href={adminRoutes.supportRequest(r.id)}
                    className={cx(smallOutline, "mt-[14px] h-[36px] w-fit")}
                    style={OUTLINE_STYLE}
                  >
                    View request →
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
    </div>
  );
}
