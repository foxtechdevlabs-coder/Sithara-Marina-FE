"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { BODY, SAND } from "@/components/admin/admin-theme";
import { input, Label, LoadState, OUTLINE_STYLE, SelectBox } from "@/components/admin/form-parts";
import { adminRoutes } from "@/constants/routes";
import {
  PageHeader,
  pagePadding,
  smallOutline,
} from "@/features/admin/bookings/components/booking-ui";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { useDebounced } from "@/features/admin/fleet/hooks/use-debounced";
import { Pager } from "@/features/admin/reports/components/report-parts";
import { cx } from "@/lib/cx";
import { listEnquiries, type Enquiry, type EnquiryQuery } from "@/services/admin/enquiries.service";

import { enquiryErrorMessage, stageLabel } from "../utils/enquiry-format";

const PAGE_SIZE = 20;

/** "Status / assignee": one control, as in the design. */
const VIEWS: {
  value: string;
  label: string;
  query: Pick<EnquiryQuery, "status" | "assigned_to">;
}[] = [
  { value: "all", label: "All stages · Anyone", query: {} },
  { value: "mine", label: "All stages · Assigned to me", query: { assigned_to: "me" } },
  { value: "unassigned", label: "Unassigned", query: { assigned_to: "none" } },
  { value: "new", label: "New", query: { status: "new" } },
  { value: "in_progress", label: "Needs details", query: { status: "in_progress" } },
  { value: "proposal_sent", label: "Proposal ready", query: { status: "proposal_sent" } },
  { value: "accepted", label: "Converted", query: { status: "accepted" } },
  { value: "rejected", label: "Declined", query: { status: "rejected" } },
  { value: "closed", label: "Closed", query: { status: "closed" } },
];

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

/** "Ananya · Astra One"; a flexible yacht when the customer didn't pick one. */
const customerYacht = (e: Enquiry) =>
  `${e.contact.full_name.split(" ")[0]} · ${e.yacht?.name ?? "Flexible yacht"}`;

/** Enquiries: "Conversations into journeys." (admin Figma A28). GET /admin/enquiries. */
export function EnquiryList() {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [view, setView] = useState("all");
  const [page, setPage] = useState(1);
  const search = useDebounced(query.trim());

  const request: EnquiryQuery = {
    page,
    limit: PAGE_SIZE,
    ...(VIEWS.find((v) => v.value === view)?.query ?? {}),
    ...(search ? { search: search.slice(0, 100) } : {}),
  };
  const list = useAdminQuery(
    (signal) => listEnquiries(request, signal),
    `enquiries:${JSON.stringify(request)}`,
  );
  const countOf = (status: EnquiryQuery["status"]) => (signal: AbortSignal) =>
    listEnquiries({ status, limit: 1 }, signal).then((r) => r.total);
  const fresh = useAdminQuery(countOf("new"), "enquiry-count:new");
  const ready = useAdminQuery(countOf("proposal_sent"), "enquiry-count:proposal_sent");
  const converted = useAdminQuery(countOf("accepted"), "enquiry-count:accepted");
  const rows = list.data?.items ?? [];
  const tile = (q: { data?: number; error?: unknown }) =>
    q.data === undefined || q.error ? "—" : String(q.data);

  return (
    <div className={pagePadding}>
      <PageHeader
        title="Conversations into journeys."
        subtitle="Enquiry inbox and proposal pipeline."
      />

      <div className="mt-[24px] grid gap-x-[18px] gap-y-[18px] lg:mt-[30px] lg:max-w-[580px] lg:grid-cols-2">
        <div>
          <Label htmlFor={searchId}>Search enquiries</Label>
          <input
            id={searchId}
            type="search"
            value={query}
            maxLength={100}
            onChange={(e) => {
              setQuery(e.currentTarget.value);
              setPage(1);
            }}
            placeholder="Reference, customer or yacht"
            className={input}
          />
        </div>
        <div>
          <Label htmlFor="enquiry-view">Status / assignee</Label>
          <SelectBox
            id="enquiry-view"
            value={view}
            onChange={(v) => {
              setView(v);
              setPage(1);
            }}
            options={VIEWS.map((v) => ({ value: v.value, label: v.label }))}
          />
        </div>
      </div>

      <div className="mt-[26px] grid gap-[14px] lg:grid-cols-3 lg:gap-[16px]">
        <Tile title="New enquiries" caption="Awaiting first review" value={tile(fresh)} />
        <Tile title="Proposal ready" caption="Awaiting customer response" value={tile(ready)} />
        <Tile title="Converted" caption="Linked to bookings" value={tile(converted)} />
      </div>

      <div className="mt-[24px]">
        {!list.data ? (
          <LoadState
            loading={list.loading}
            error={
              list.error ? `Couldn't load enquiries. ${enquiryErrorMessage(list.error)}` : undefined
            }
            onRetry={list.reload}
            label="Loading enquiries"
          />
        ) : !rows.length ? (
          <p className="text-[13px]" style={{ color: BODY }}>
            {search || view !== "all" ? "No enquiries match these filters." : "No enquiries yet."}
          </p>
        ) : (
          <div className={cx(list.loading && "opacity-60")}>
            <table className="hidden w-full border-collapse text-left text-[11px] lg:table">
              <caption className="sr-only">Enquiries</caption>
              <thead>
                <tr style={{ backgroundColor: SAND }}>
                  {["Enquiry", "Customer / yacht", "Assignee", "Stage"].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="w-1/4 px-[12px] py-[12px] font-normal"
                      style={{ color: BODY }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white">
                {rows.map((e) => (
                  <tr key={e.id} className="border-b border-[#ebe9e4]">
                    <td className="px-[12px] py-[12px]">
                      <Link
                        href={adminRoutes.enquiry(e.id)}
                        className="underline-offset-2 hover:underline"
                      >
                        {e.reference}
                      </Link>
                    </td>
                    <td className="px-[12px] py-[12px] break-words" title={e.contact.full_name}>
                      {customerYacht(e)}
                    </td>
                    <td className="px-[12px] py-[12px]">
                      {e.assigned_to?.full_name ?? "Unassigned"}
                    </td>
                    <td className="px-[12px] py-[12px]">{stageLabel(e.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="grid gap-[14px] lg:hidden">
              {rows.map((e) => (
                <li key={e.id} className={card}>
                  <p className="text-[18px] leading-[24px]">{e.reference}</p>
                  <dl className="text-[13px]">
                    {(
                      [
                        ["Customer / yacht", customerYacht(e)],
                        ["Assignee", e.assigned_to?.full_name ?? "Unassigned"],
                        ["Stage", stageLabel(e.status)],
                      ] as const
                    ).map(([t, v]) => (
                      <div key={t} className="mt-[10px]">
                        <dt className="text-[11px]" style={{ color: BODY }}>
                          {t}
                        </dt>
                        <dd className="break-words">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <Link
                    href={adminRoutes.enquiry(e.id)}
                    className={cx(smallOutline, "mt-[14px] h-[36px] w-fit")}
                    style={OUTLINE_STYLE}
                  >
                    View details →
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
