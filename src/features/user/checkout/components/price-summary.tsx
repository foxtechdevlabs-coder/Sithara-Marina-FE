import {
  formatClockTime,
  formatDay,
  formatDuration,
  formatMinorUnits,
} from "@/features/user/yachts/utils/yacht-view";
import type { Booking } from "@/services/user/booking.service";
import type { CheckoutSession, Quote } from "@/services/user/checkout.service";

import { SummaryRows, type SummaryRow } from "./checkout-ui";

const guestCount = (guests: number) => `${guests} ${guests === 1 ? "guest" : "guests"}`;

const timeRange = (start: string, end: string | null) =>
  end ? `${formatClockTime(start)} – ${formatClockTime(end)}` : formatClockTime(start);

const money = (amount: number, currency: string) => formatMinorUnits(amount, currency) ?? "";

interface Line {
  name: string;
  quantity: number;
  amount: number;
}

const addonRows = (addons: Line[], currency: string): SummaryRow[] =>
  addons.map((addon) => ({
    label: addon.quantity > 1 ? `${addon.name} × ${addon.quantity}` : addon.name,
    value: money(addon.amount, currency),
  }));

const taxName = (label: string, rate: number | null) =>
  rate === null ? label : `${label} (${rate}%)`;

/** The money in a quote. Every figure is the backend's; nothing is added up here. */
export function quotePriceRows(quote: Quote): SummaryRow[] {
  const { currency } = quote;
  return [
    { label: "Charter", value: money(quote.base_amount, currency) },
    ...(quote.extra_guest_amount > 0
      ? [{ label: "Extra guests", value: money(quote.extra_guest_amount, currency) }]
      : []),
    ...addonRows(quote.addons, currency),
    ...(quote.addons.length > 0
      ? [{ label: "Add-ons total", value: money(quote.addons_amount, currency) }]
      : []),
    { label: "Taxable amount", value: money(quote.taxable_amount, currency) },
    { label: taxName(quote.tax_label, quote.tax_rate), value: money(quote.tax_amount, currency) },
    { label: "Total", value: money(quote.total_amount, currency), strong: true },
  ];
}

export function QuoteRows({ quote }: { quote: Quote }) {
  const { slot } = quote;
  const rows: SummaryRow[] = [
    { label: "Yacht", value: quote.yacht.name },
    { label: "Date", value: formatDay(slot.date) },
    {
      label: `${slot.slot_type_name} charter`,
      value: `${timeRange(slot.start_time, slot.end_time)} · ${formatDuration(slot.duration_minutes)}`,
    },
    { label: "Guests", value: guestCount(quote.guests) },
    ...quotePriceRows(quote),
  ];
  return <SummaryRows rows={rows} />;
}

/** The checkout session's own figures: its totals are what the customer accepts. */
export function SessionRows({ session }: { session: CheckoutSession }) {
  const { pricing, totals, slot } = session;
  const facts: SummaryRow[] = [
    { label: "Yacht", value: session.yacht.name },
    { label: "Date", value: formatDay(slot.date) },
    {
      label: slot.slot_type_name ? `${slot.slot_type_name} charter` : "Charter",
      value: timeRange(slot.start_time, slot.end_time),
    },
    { label: "Guests", value: guestCount(session.guests) },
  ];
  if (!pricing) return <SummaryRows rows={facts} />;

  const { currency } = pricing;
  return (
    <SummaryRows
      rows={[
        ...facts,
        { label: "Charter", value: money(pricing.charter_amount, currency) },
        ...addonRows(pricing.addons, currency),
        ...(pricing.addons.length > 0
          ? [{ label: "Add-ons total", value: money(pricing.addons_amount, currency) }]
          : []),
        { label: "Taxable amount", value: money(pricing.subtotal, currency) },
        ...(totals
          ? [
              { label: taxName("GST", totals.tax_rate), value: money(totals.tax_amount, currency) },
              { label: "Total", value: money(totals.total_amount, currency), strong: true },
            ]
          : []),
      ]}
    />
  );
}

/** What was booked, as the backend stored it. */
export function BookingRows({ booking }: { booking: Booking }) {
  const { pricing, slot } = booking;
  const { currency } = pricing;
  return (
    <SummaryRows
      rows={[
        { label: "Yacht", value: booking.yacht.name },
        { label: "Date", value: formatDay(slot.date) },
        {
          label: slot.slot_type_name ? `${slot.slot_type_name} charter` : "Charter",
          value: `${timeRange(slot.start_time, slot.end_time)} (${slot.time_zone})`,
        },
        { label: "Guests", value: guestCount(booking.guest_count) },
        ...(pricing.charter_amount === null
          ? []
          : [{ label: "Charter", value: money(pricing.charter_amount, currency) }]),
        ...addonRows(pricing.addons, currency),
        { label: "Subtotal", value: money(pricing.subtotal, currency) },
        {
          label: taxName(pricing.tax_label, pricing.tax_rate),
          value: money(pricing.tax_amount, currency),
        },
        { label: "Total", value: money(pricing.total_amount, currency), strong: true },
      ]}
    />
  );
}
