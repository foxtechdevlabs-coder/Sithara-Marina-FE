"use client";

import { CharterSummaryCard } from "@/components/user/charter-summary-card";
import { AccountNotice } from "@/features/user/account/components/account-ui";
import { formatLongDate, guests } from "@/features/user/account/utils/account-format";
import { quotePriceRows } from "@/features/user/checkout/components/price-summary";
import { useQuote } from "@/features/user/checkout/components/quote-summary";
import {
  useCheckoutState,
  type CheckoutDraft,
} from "@/features/user/checkout/utils/checkout-store";
import { dummyFleet } from "@/features/user/home/data/dummy-fleet";
import { formatClockTime, formatDuration } from "@/features/user/yachts/utils/yacht-view";

import { AccountPageShell } from "./account-page-shell";
import { SignInForm } from "./sign-in-form";

/**
 * Sign in during checkout (`/login?next=/checkout`): "Welcome back to your
 * charter." The charter chosen so far stays in this tab's checkout state, so it
 * is shown beside the form with its live price, and guests can carry on.
 */
export function CheckoutSignInPage() {
  const draft = useCheckoutState()?.draft ?? null;

  return (
    <AccountPageShell
      headingId="checkout-sign-in-heading"
      heading="Welcome back"
      headingSerif="to your charter."
      subtitle="Sign in to return to your saved booking details."
      aside={
        draft ? (
          <div className="mt-12 md:mt-0 md:pt-[17rem] lg:pt-[calc(var(--r)*110)]">
            <DraftSummary draft={draft} />
          </div>
        ) : null
      }
    >
      <SignInForm variant="checkout" />
      {draft ? (
        <AccountNotice
          label="Your charter is kept"
          className="mt-10 max-w-[35rem] lg:mt-[calc(var(--r)*40)] lg:w-[calc(var(--rw)*740)] lg:max-w-none"
        >
          {draft.yacht.name} · {formatLongDate(draft.date)} · {formatClockTime(draft.start_time)} ·{" "}
          {guests(draft.guests)}. Availability is checked again before payment.
        </AccountNotice>
      ) : null}
    </AccountPageShell>
  );
}

/** The pearl "Your time on the water" card, priced by POST /pricing/quote. */
function DraftSummary({ draft }: { draft: CheckoutDraft }) {
  const { yacht, ...selection } = draft;
  const quote = useQuote({ ...selection, yacht_id: yacht.id });
  const fleetYacht = dummyFleet.find((item) => item.id === yacht.slug);
  const slot = quote.data?.slot;
  const priceRows = quote.data ? quotePriceRows(quote.data) : [];
  const total = priceRows.find((row) => row.strong)?.value ?? null;

  return (
    <CharterSummaryCard
      tone="pearl"
      yachtName={yacht.name}
      subtitle={`${fleetYacht?.location ?? "Kerala"} · Private, fully crewed`}
      imageUrl={fleetYacht?.image.src}
      imageSizes="(min-width: 768px) 26vw, 100vw"
      facts={[
        { label: "Departure", value: formatLongDate(draft.date) },
        {
          label: "Time",
          value: slot
            ? `${formatClockTime(slot.start_time)}–${formatClockTime(slot.end_time)} · ${formatDuration(slot.duration_minutes)}`
            : formatClockTime(draft.start_time),
        },
        {
          label: "Your company",
          value: `${guests(draft.guests)}${fleetYacht ? ` · up to ${fleetYacht.guests}` : ""}`,
        },
      ]}
      prices={priceRows.filter((row) => !row.strong)}
      total={total}
      pricesFallback={
        quote.loading ? (
          <p className="border-navy-ink/15 text-body border-t pt-5 text-[12px]">
            Calculating your price…
          </p>
        ) : quote.error ? (
          <p className="border-navy-ink/15 text-body border-t pt-5 text-[12px]">
            Your price is confirmed at checkout.
          </p>
        ) : undefined
      }
    />
  );
}
