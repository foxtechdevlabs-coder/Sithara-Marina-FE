"use client";

import {
  Loading,
  Notice,
  SectionTitle,
  textLinkClass,
} from "@/features/user/checkout/components/checkout-ui";
import { checkoutErrorMessage } from "@/features/user/checkout/utils/checkout-error-message";
import { useApiQuery } from "@/hooks/use-api-query";
import { getBackendErrorDetails } from "@/services/http/backend-error";
import { getInvoice } from "@/services/user/booking.service";

/**
 * The invoice of a confirmed booking. An invoice that isn't ready yet is normal
 * (the backend makes it after confirmation), never a booking failure.
 */
export function InvoicePanel({
  bookingId,
  checkoutToken,
}: {
  bookingId: string;
  checkoutToken: string | null;
}) {
  const invoice = useApiQuery((signal) => getInvoice(bookingId, checkoutToken, signal), bookingId);
  const data = invoice.data;
  const notYet = getBackendErrorDetails(invoice.error).code === "INVOICE_NOT_AVAILABLE";
  const refresh = (
    <button type="button" className={textLinkClass} onClick={invoice.reload}>
      Check again
    </button>
  );

  return (
    <section className="mt-[40px]">
      <SectionTitle>Invoice</SectionTitle>
      {invoice.loading ? (
        <Loading label="Loading your invoice" />
      ) : notYet ? (
        <Notice>Your invoice will be available once the booking is confirmed. {refresh}</Notice>
      ) : invoice.error ? (
        <Notice alert>
          {checkoutErrorMessage(invoice.error, "We couldn’t load your invoice just now.")} {refresh}
        </Notice>
      ) : data?.status === "generated" && data.download_url ? (
        <p className="mt-[16px] text-[16px] leading-[26px]">
          {data.invoice_number ? `Invoice ${data.invoice_number}. ` : ""}
          <a
            href={data.download_url}
            target="_blank"
            rel="noopener noreferrer"
            className={textLinkClass}
          >
            Download invoice (PDF)
          </a>
        </p>
      ) : (
        <Notice>Your invoice is being prepared. {refresh}</Notice>
      )}
    </section>
  );
}
