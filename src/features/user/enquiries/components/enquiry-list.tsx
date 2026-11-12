"use client";

import Link from "next/link";
import { useState } from "react";

import { userRoutes } from "@/constants/routes";
import { Loading, Notice, textLinkClass } from "@/features/user/checkout/components/checkout-ui";
import {
  AccountPage,
  DetailGrid,
  Pagination,
  StatusPill,
} from "@/features/user/profile/components/account-ui";
import { accountErrorMessage } from "@/features/user/profile/utils/account-error-message";
import { formatClockTime, formatDateTime, formatDay } from "@/features/user/yachts/utils/yacht-view";
import { useApiQuery } from "@/hooks/use-api-query";
import { cx } from "@/lib/cx";
import { getMyEnquiries, type Enquiry } from "@/services/user/enquiries.service";

import { ENQUIRY_STATUS } from "./enquiry-labels";

const PAGE_SIZE = 10;

/** The customer's enquiries, paged by the backend. */
export function EnquiryList() {
  const [page, setPage] = useState(1);
  const list = useApiQuery((signal) => getMyEnquiries({ page, limit: PAGE_SIZE }, signal), String(page));
  const data = list.data;

  return (
    <AccountPage
      heading="Your"
      headingSerif="enquiries."
      intro="Charters you’ve asked us about, and the proposals our concierge has sent."
    >
      <div aria-busy={list.loading}>
        {list.loading && !data ? (
          <Loading label="Loading your enquiries" />
        ) : list.error && !data ? (
          <Notice alert>
            {accountErrorMessage(list.error, "We couldn’t load your enquiries.")}{" "}
            <button type="button" className={textLinkClass} onClick={list.reload}>
              Try again
            </button>
          </Notice>
        ) : data && data.items.length === 0 ? (
          <Notice>
            You haven’t sent any enquiries yet.{" "}
            <Link href={userRoutes.planCharter} className={textLinkClass}>
              Plan a charter
            </Link>
          </Notice>
        ) : data ? (
          <>
            {list.loading && <Loading label="Updating" />}
            <ul className={cx("grid gap-[20px]", list.loading && "opacity-60")}>
              {data.items.map((enquiry) => (
                <EnquiryCard key={enquiry.id} enquiry={enquiry} />
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

/** What the customer asked for; values they left out are said so, not invented. */
export function enquiryFacts(enquiry: Enquiry) {
  return [
    { label: "Package", value: enquiry.slot_type?.name ?? "Any" },
    {
      label: "Preferred date",
      value: enquiry.preferred_date ? formatDay(enquiry.preferred_date) : "Flexible",
    },
    {
      label: "Preferred start",
      value: enquiry.preferred_start_time ? formatClockTime(enquiry.preferred_start_time) : "Flexible",
    },
    { label: "Guests", value: enquiry.guests === null ? "Not given" : String(enquiry.guests) },
    { label: "Sent", value: formatDateTime(enquiry.created_at) },
  ];
}

function EnquiryCard({ enquiry }: { enquiry: Enquiry }) {
  const status = ENQUIRY_STATUS[enquiry.status];
  return (
    <li className="border border-[#e3e5e8] p-[20px] sm:p-[28px]">
      <div className="flex flex-wrap items-start justify-between gap-[12px]">
        <div className="min-w-0">
          <p className="text-[11px] tracking-[0.16em] text-[#7a7f85] uppercase">{enquiry.reference}</p>
          <p className="mt-[6px] text-[22px] leading-[28px] break-words">
            {enquiry.yacht?.name ?? "Any yacht"}
          </p>
        </div>
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
      </div>
      <div className="mt-[20px]">
        <DetailGrid items={enquiryFacts(enquiry)} />
      </div>
      <Link
        href={userRoutes.accountEnquiry(enquiry.reference)}
        className="mt-[20px] inline-block border-b border-[#0d1b2a] pb-[4px] text-[12px] tracking-[0.18em] uppercase transition-opacity hover:opacity-70"
      >
        View details<span className="sr-only"> of {enquiry.reference}</span>
      </Link>
    </li>
  );
}
