"use client";

import { ArrowDown } from "lucide-react";
import Link from "next/link";

import {
  AccountHeading,
  type AccountHeadingProps,
  AccountNotice,
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
  formatInstantDate,
  formatLongDate,
} from "@/features/user/account/utils/account-format";
import { isUpcomingBooking } from "@/features/user/customer-bookings/utils/booking-view";
import { userRoutes } from "@/constants/routes";
import { useApiQuery } from "@/hooks/use-api-query";
import { cx } from "@/lib/cx";
import { isApiError } from "@/services/http/api-error";
import { getMyBooking, type BookingDetail } from "@/services/user/customer-bookings.service";
import { getBookingInvoice, type Invoice } from "@/services/user/invoices.service";

const DEFAULT_HEADING: AccountHeadingProps = {
  heading: "Your booking invoice.",
  subtitle: "Invoice view · Download a copy for your records.",
};

/** The booking (by reference), then its invoice (by the booking's id). */
async function loadInvoice(bookingRef: string, signal: AbortSignal) {
  const booking = await getMyBooking(bookingRef, signal);
  try {
    return { booking, invoice: await getBookingInvoice(booking.id, signal) };
  } catch (error) {
    // 409 INVOICE_NOT_AVAILABLE: the booking is not confirmed (yet).
    if (isApiError(error) && error.code === "INVOICE_NOT_AVAILABLE") {
      return { booking, invoice: null };
    }
    throw error;
  }
}

const PAYMENT_METHOD_LABELS: Record<NonNullable<Invoice["payment_method"]>, string> = {
  gateway: "Paid online",
  cash: "Paid in cash",
  bank_transfer: "Paid by bank transfer",
};

/**
 * A booking's invoice: Figma C20 "Your booking invoice." before the charter,
 * C36 "Your previous charter, in detail." after. Lines are the backend's
 * figures; the PDF is the backend's signed `download_url`.
 */
export function BookingInvoice({ bookingRef }: { bookingRef: string }) {
  const query = useApiQuery((signal) => loadInvoice(bookingRef, signal), bookingRef);

  if (!query.data) {
    return (
      <>
        <AccountHeading {...DEFAULT_HEADING} />
        <QueryFallback
          query={query}
          loadingLabel="Loading your invoice"
          notFoundMessage="We couldn’t find this booking in your account."
        />
      </>
    );
  }

  const { booking, invoice } = query.data;
  if (!invoice) {
    return (
      <>
        <AccountHeading {...DEFAULT_HEADING} />
        <AccountNotice label="Not available yet" className="mt-8">
          An invoice is issued once booking {booking.reference} is confirmed and paid.
        </AccountNotice>
        <Link
          href={userRoutes.accountBooking(booking.reference)}
          className={`${secondaryButtonClass} mt-6`}
        >
          Back to booking
        </Link>
      </>
    );
  }

  return <InvoiceBody booking={booking} invoice={invoice} onReload={query.reload} />;
}

function InvoiceBody({
  booking,
  invoice,
  onReload,
}: {
  booking: BookingDetail;
  invoice: Invoice;
  onReload: () => void;
}) {
  const isPast = !isUpcomingBooking(booking);
  const amount = (value: number) => formatAmount(value, booking.pricing.currency);
  const isReady = invoice.status === "generated" && invoice.download_url !== null;
  const lines = [
    {
      description: `${booking.yacht.name} · ${booking.slot.slot_type_name ?? "Private"} charter`,
      quantity: "1",
      amount: invoice.charter_price_paise,
    },
    ...(invoice.addons_price_paise > 0
      ? [
          {
            description: "Add-ons",
            quantity:
              booking.pricing.addons
                .map((addon) => `${addon.name} × ${addon.quantity}`)
                .join(", ") || "—",
            amount: invoice.addons_price_paise,
          },
        ]
      : []),
    {
      description: `GST (${invoice.gst_rate_applied}%)`,
      quantity: "As charged",
      amount: invoice.gst_amount_paise,
    },
  ];

  const actions = (
    <div className={cx(buttonRowClass, "mt-6 print:hidden")}>
      {isReady ? (
        <a
          href={invoice.download_url ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          className={primaryButtonClass}
          style={primaryButtonStyle}
        >
          Download invoice
          <ArrowDown aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
        </a>
      ) : (
        <button
          type="button"
          onClick={onReload}
          className={primaryButtonClass}
          style={primaryButtonStyle}
        >
          Check for the PDF again
        </button>
      )}
      <Link href={userRoutes.accountBooking(booking.reference)} className={secondaryButtonClass}>
        {isPast ? "Back to charter" : "Back to booking"}
      </Link>
    </div>
  );

  const paidLabel =
    booking.payment_status === "succeeded"
      ? "Paid in full"
      : invoice.payment_method
        ? PAYMENT_METHOD_LABELS[invoice.payment_method]
        : null;

  return (
    <>
      {isPast ? (
        <AccountHeading
          heading="Your previous charter,"
          headingSerif="in detail."
          subtitle={`Invoice ${invoice.invoice_number ?? "being prepared"} · Booking ${booking.reference}`}
        />
      ) : (
        <AccountHeading
          {...DEFAULT_HEADING}
          eyebrow={invoice.invoice_number ? `Invoice ${invoice.invoice_number}` : undefined}
        />
      )}

      {/* C20 offers the download first; C36 after the figures. */}
      {isPast ? null : actions}

      {isReady ? null : (
        <AccountNotice label="Your PDF is being prepared" className="mt-6">
          The figures below are final. A downloadable copy will be ready shortly.
        </AccountNotice>
      )}

      <section aria-labelledby="invoice-issuer" className={isPast ? "mt-8 lg:mt-10" : "mt-10"}>
        <CardTitle>
          <span id="invoice-issuer">{invoice.provider.legal_name ?? "Sithara Marina"}</span>
        </CardTitle>
        {invoice.provider.address || invoice.provider.gstin ? (
          <p className="text-body mt-3 text-[11px]">
            {[
              invoice.provider.address,
              invoice.provider.gstin ? `GSTIN ${invoice.provider.gstin}` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        ) : null}

        <DetailRows
          className="mt-7"
          rows={[
            {
              label: "Issued to",
              value: `${invoice.customer.name} · ${invoice.customer.email}`,
            },
            ...(isPast
              ? [{ label: "Charter date", value: formatLongDate(booking.slot.date) }]
              : [
                  { label: "Booking", value: booking.reference },
                  { label: "Invoice date", value: formatInstantDate(invoice.created_at) },
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
            {lines.map((line) => (
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
          {lines.map((line) => (
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
          <dd className="text-navy-ink text-[15px]">{amount(invoice.total_amount_paise)}</dd>
        </dl>
        {paidLabel ? <StatusChip className="mt-5 sm:ml-3">{paidLabel}</StatusChip> : null}
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
