"use client";

import { useApiQuery } from "@/hooks/use-api-query";
import { getPricingQuote, type CheckoutSelection } from "@/services/user/checkout.service";

import { checkoutErrorMessage } from "../utils/checkout-error-message";
import { Loading, Notice, textLinkClass } from "./checkout-ui";
import { QuoteRows } from "./price-summary";

/** Live quote for a selection; `null` waits until the selection is complete. */
export function useQuote(selection: CheckoutSelection | null) {
  return useApiQuery(
    (signal) => (selection ? getPricingQuote(selection, signal) : Promise.resolve(null)),
    JSON.stringify(selection),
  );
}

export function QuoteSummary({ quote }: { quote: ReturnType<typeof useQuote> }) {
  if (quote.loading) return <Loading label="Calculating your price" />;
  if (quote.error) {
    return (
      <Notice alert>
        {checkoutErrorMessage(quote.error, "We couldn’t work out the price just now.")}{" "}
        <button type="button" className={textLinkClass} onClick={quote.reload}>
          Try again
        </button>
      </Notice>
    );
  }
  return quote.data ? <QuoteRows quote={quote.data} /> : null;
}
