"use client";

import { ArrowDown } from "lucide-react";
import Link from "next/link";

import {
  AccountHeading,
  type AccountHeadingProps,
  buttonRowClass,
  CardTitle,
  DetailRows,
  primaryButtonClass,
  primaryButtonStyle,
  secondaryButtonClass,
  StatusChip,
} from "@/features/user/account/components/account-ui";
import { QueryFallback } from "@/features/user/account/components/query-fallback";
import {
  formatAmount,
  formatLongDate,
  todayInKerala,
} from "@/features/user/account/utils/account-format";
import { userRoutes } from "@/constants/routes";
import { useApiQuery } from "@/hooks/use-api-query";
import { cx } from "@/lib/cx";
import { getBookingInvoice, type Invoice } from "@/services/user/invoices.service";

const PAYMENT_LABELS: Record<Invoice["payment_status"], string> = {
  paid: "Paid in full",
  partially_paid: "Part paid",
  unpaid: "Awaiting payment",
  refunded: "Refunded",
};

const DEFAULT_HEADING: AccountHeadingProps = {
  heading: "Your booking invoice.",
  subtitle: "Invoice view · Download a copy for your records.",
};

/**
 * A booking's invoice, as a table (cards on phones): Figma C20 "Your booking
 * invoice." before the charter, C36 "Your previous charter, in detail." after.
 */
export function BookingInvoice({ bookingId }: { bookingId: string }) {
  const query = useApiQuery((signal) => getBookingInvoice(bookingId, signal), bookingId);

  if (!query.data) {
    return (
      <>
        <AccountHeading {...DEFAULT_HEADING} />
        <QueryFallback
          query={query}
          loadingLabel="Loading your invoice"
          notFoundMessage="There is no invoice for this booking yet."
        />
      </>
    );
  }

  return <InvoiceBody invoice={query.data} />;
}

function InvoiceBody({ invoice }: { invoice: Invoice }) {
  const isPast = invoice.charter_date < todayInKerala();
  const amount = (value: number) => formatAmount(value, invoice.currency);

  const actions = (
    <div className={cx(buttonRowClass, "mt-6 print:hidden")}>
      {/* No invoice PDF endpoint yet: the browser's print dialog saves a PDF copy. */}
      <button
        type="button"
        onClick={() => window.print()}
        className={primaryButtonClass}
        style={primaryButtonStyle}
      >
        Download invoice
        <ArrowDown aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
      </button>
      <Link href={userRoutes.accountBooking(invoice.booking_id)} className={secondaryButtonClass}>
        {isPast ? "Back to charter" : "Back to booking"}
      </Link>
    </div>
  );

  return (
    <>
      {isPast ? (
        <AccountHeading
          heading="Your previous charter,"
          headingSerif="in detail."
          subtitle={`Invoice ${invoice.invoice_number} · Booking ${invoice.booking_reference}`}
        />
      ) : (
        <AccountHeading {...DEFAULT_HEADING} eyebrow={`Invoice ${invoice.invoice_number}`} />
      )}

      {/* C20 offers the download first; C36 after the figures. */}
      {isPast ? null : actions}

      <section aria-labelledby="invoice-issuer" className={isPast ? "mt-8 lg:mt-10" : "mt-10"}>
        <CardTitle>
          <span id="invoice-issuer">{invoice.issuer.name}</span>
        </CardTitle>
        {isPast ? null : <p className="text-body mt-3 text-[11px]">{invoice.issuer.address}</p>}

        <DetailRows
          className="mt-7"
          rows={[
            {
              label: "Issued to",
              value: `${invoice.issued_to.full_name} · ${invoice.issued_to.email}`,
            },
            ...(isPast
              ? [{ label: "Charter date", value: formatLongDate(invoice.charter_date) }]
              : [
                  { label: "Booking", value: invoice.booking_reference },
                  { label: "Invoice date", value: formatLongDate(invoice.issued_on) },
                ]),
          ]}
        />

        {/* Desktop and print: a table. */}
        <table className="mt-8 hidden w-full border-collapse text-left text-[13px] sm:table">
          <caption className="sr-only">Invoice lines</caption>
          <thead className="bg-pearl text-body text-[12px]">
            <tr>
              <th scope="col" className="w-[38%] px-3 py-4 font-normal">
                Description
              </th>
              <th scope="col" className="w-[30%] px-3 py-4 font-normal">
                Quantity
              </th>
              <th scope="col" className="px-3 py-4 font-normal">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="text-navy-ink">
            {invoice.lines.map((line) => (
              <tr key={line.description} className="border-rule border-b">
                <td className="px-3 py-4">{line.description}</td>
                <td className="px-3 py-4">{line.quantity}</td>
                <td className="px-3 py-4">{amount(line.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Phones: one card per line. */}
        <ul className="mt-8 space-y-4 sm:hidden">
          {invoice.lines.map((line) => (
            <li key={line.description} className="border-rule border p-5">
              <p className="text-navy-ink text-[1.125rem]">{line.description}</p>
              <DetailRows
                className="mt-3"
                compact
                rows={[
                  { label: "Quantity", value: line.quantity },
                  { label: "Amount", value: amount(line.amount) },
                ]}
              />
            </li>
          ))}
        </ul>

        <dl className="mt-7 grid gap-1.5 text-[13px] sm:grid-cols-[68%_1fr] sm:px-3">
          <dt className="text-body text-[12px]">{isPast ? "Total paid" : "Total"}</dt>
          <dd className="text-navy-ink text-[15px]">{amount(invoice.total_amount)}</dd>
        </dl>
        <StatusChip className="mt-5 sm:ml-3">{PAYMENT_LABELS[invoice.payment_status]}</StatusChip>
        {isPast ? null : (
          <p className="text-body mt-4 text-[11px] leading-relaxed sm:px-3">
            Keep this invoice with your booking records. Contact our concierge if a billing detail
            needs to be updated.
          </p>
        )}
      </section>

      {isPast ? actions : null}
    </>
  );
}
