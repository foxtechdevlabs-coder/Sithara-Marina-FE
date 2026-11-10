"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { BODY, SAND } from "@/components/admin/admin-theme";
import { input, LoadState, OUTLINE_STYLE } from "@/components/admin/form-parts";
import { adminRoutes } from "@/constants/routes";
import {
  InfoPanel,
  PageHeader,
  pagePadding,
  smallOutline,
} from "@/features/admin/bookings/components/booking-ui";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { useDebounced } from "@/features/admin/fleet/hooks/use-debounced";
import { cx } from "@/lib/cx";
import {
  customerIdsForBookingReference,
  getCustomer,
  getLatestBooking,
  listCustomers,
  type Customer,
  type CustomerList as CustomerPage,
} from "@/services/admin/customers.service";

import {
  customerErrorMessage,
  latestActivityText,
  looksLikeBookingReference,
} from "../utils/customer-format";

const PAGE_SIZE = 20;

/** Matches by name, email or phone; a booking reference finds the customer who made it. */
async function findCustomers(
  search: string,
  page: number,
  signal: AbortSignal,
): Promise<CustomerPage> {
  if (looksLikeBookingReference(search)) {
    const ids = (await customerIdsForBookingReference(search, signal)).slice(0, 10);
    const items = await Promise.all(ids.map((id) => getCustomer(id, signal)));
    return { items, total: items.length, page: 1, limit: PAGE_SIZE };
  }
  return listCustomers(
    {
      page,
      limit: PAGE_SIZE,
      sort: search ? "name" : "newest",
      ...(search ? { search: search.slice(0, 100) } : {}),
    },
    signal,
  );
}

/** "Latest activity": the customer's newest booking, looked up per row. */
function LatestActivity({ customer }: { customer: Customer }) {
  const latest = useAdminQuery(
    (signal) =>
      customer.booking_count > 0 ? getLatestBooking(customer.id, signal) : Promise.resolve(null),
    `latest-booking:${customer.id}:${customer.booking_count}`,
  );
  if (customer.booking_count === 0) return <>No bookings yet</>;
  if (latest.loading) return <span style={{ color: BODY }}>Loading…</span>;
  if (latest.error || !latest.data) return <span style={{ color: BODY }}>—</span>;
  return (
    <Link href={adminRoutes.booking(latest.data.id)} className="hover:underline">
      {latestActivityText(latest.data)}
    </Link>
  );
}

function ContactText({ customer }: { customer: Customer }) {
  return (
    <>
      <span className="break-all">{customer.email}</span>
      {!customer.email_verified_at && (
        <span className="ml-[6px] text-[10px] whitespace-nowrap" style={{ color: BODY }}>
          · unverified
        </span>
      )}
    </>
  );
}

/**
 * Customers: "The people behind each journey." (admin Figma A21).
 * Data: GET /admin/customers; latest activity from GET /admin/bookings.
 */
export function CustomerList() {
  const searchId = useId();
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const search = useDebounced(query.trim());

  const list = useAdminQuery(
    (signal) => findCustomers(search, page, signal),
    `customers:${search}:${page}`,
  );
  const rows = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className={pagePadding}>
      <PageHeader
        title="The people behind each journey."
        subtitle="Customer contact details, booking history and enquiry context."
      />

      <div className="mt-[24px] flex flex-wrap items-end gap-[14px] lg:mt-[30px]">
        <div className="w-full lg:w-[360px]">
          <label htmlFor={searchId} className="block text-[10px]" style={{ color: BODY }}>
            Find a customer
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            maxLength={100}
            onChange={(e) => {
              setQuery(e.currentTarget.value);
              setPage(1);
            }}
            placeholder="Name, verified email or booking reference"
            className={cx(input, "mt-[8px]")}
          />
        </div>
        <Link
          href={adminRoutes.customerNew}
          className={cx(smallOutline, "min-w-[118px]")}
          style={OUTLINE_STYLE}
        >
          + Add customer
        </Link>
      </div>

      <div className="mt-[30px] lg:mt-[40px]">
        {!list.data ? (
          <LoadState
            loading={list.loading}
            error={
              list.error
                ? `Couldn't load customers. ${customerErrorMessage(list.error)}`
                : undefined
            }
            onRetry={list.reload}
            label="Loading customers"
          />
        ) : !rows.length ? (
          <p className="text-[13px]" style={{ color: BODY }}>
            {search
              ? looksLikeBookingReference(search)
                ? "No customer has a booking with this reference."
                : "No customers match this search."
              : "No customers yet."}
          </p>
        ) : (
          <>
            {/* Desktop table */}
            <table
              className={cx(
                "hidden w-full border-collapse text-left text-[11px] lg:table",
                list.loading && "opacity-60",
              )}
            >
              <caption className="sr-only">Customers</caption>
              <thead>
                <tr style={{ backgroundColor: SAND }}>
                  {["Customer", "Contact", "Bookings", "Latest activity"].map((h) => (
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
                {rows.map((c) => (
                  <tr key={c.id} className="border-b border-[#ebe9e4]">
                    <td className="px-[12px] py-[12px]">
                      <Link
                        href={adminRoutes.customer(c.id)}
                        className="underline-offset-2 hover:underline"
                      >
                        {c.full_name}
                      </Link>
                      {!c.is_active && (
                        <span className="ml-[6px] text-[10px]" style={{ color: BODY }}>
                          (inactive)
                        </span>
                      )}
                    </td>
                    <td className="px-[12px] py-[12px]">
                      <ContactText customer={c} />
                    </td>
                    <td className="px-[12px] py-[12px]">{c.booking_count}</td>
                    <td className="px-[12px] py-[12px]">
                      <LatestActivity customer={c} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Phone cards */}
            <ul className={cx("grid gap-[16px] lg:hidden", list.loading && "opacity-60")}>
              {rows.map((c) => (
                <li key={c.id} className="border border-[#dcdad5] bg-white px-[20px] py-[22px]">
                  <h2 className="text-[20px] leading-[26px]">
                    {c.full_name}
                    {!c.is_active && (
                      <span className="ml-[6px] text-[11px]" style={{ color: BODY }}>
                        (inactive)
                      </span>
                    )}
                  </h2>
                  <dl className="text-[13px] leading-[19px]">
                    <dt className="mt-[12px] text-[11px]" style={{ color: BODY }}>
                      Contact
                    </dt>
                    <dd className="mt-[2px]">
                      <ContactText customer={c} />
                    </dd>
                    <dt className="mt-[10px] text-[11px]" style={{ color: BODY }}>
                      Bookings
                    </dt>
                    <dd className="mt-[2px]">{c.booking_count}</dd>
                    <dt className="mt-[10px] text-[11px]" style={{ color: BODY }}>
                      Latest activity
                    </dt>
                    <dd className="mt-[2px]">
                      <LatestActivity customer={c} />
                    </dd>
                  </dl>
                  <Link
                    href={adminRoutes.customer(c.id)}
                    className={cx(smallOutline, "mt-[14px] h-[38px] w-fit")}
                    style={OUTLINE_STYLE}
                  >
                    View details →<span className="sr-only"> for {c.full_name}</span>
                  </Link>
                </li>
              ))}
            </ul>

            {pages > 1 && (
              <div className="mt-[20px] flex items-center gap-[12px] text-[12px]">
                <button
                  type="button"
                  disabled={page <= 1 || list.loading}
                  onClick={() => setPage(page - 1)}
                  className={smallOutline}
                  style={OUTLINE_STYLE}
                >
                  Previous
                </button>
                <span style={{ color: BODY }}>
                  Page {page} of {pages} · {total} customers
                </span>
                <button
                  type="button"
                  disabled={page >= pages || list.loading}
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

      <InfoPanel title="Contact context" className="mt-[24px]">
        Use verified contact details and the customer’s enquiry context. Access to personal
        information follows staff permissions.
      </InfoPanel>
    </div>
  );
}
