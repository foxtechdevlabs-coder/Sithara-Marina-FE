"use client";

import Link from "next/link";
import { useState, type FormEvent, type ReactNode } from "react";

import { BODY, INK, MUTED, SAND } from "@/components/admin/admin-theme";
import {
  errorProps,
  FieldError,
  input,
  Label,
  LoadState,
  Notice,
  OUTLINE_STYLE,
  PRIMARY_STYLE,
} from "@/components/admin/form-parts";
import { adminRoutes } from "@/constants/routes";
import { refundChannelText, refundStatusLabel } from "@/features/admin/refunds/utils/money-format";
import { listCancellationRequests } from "@/services/admin/cancellation-requests.service";
import { useAdminSession } from "@/features/admin/auth/components/admin-session-provider";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { cx } from "@/lib/cx";
import {
  addBookingNote,
  changeBookingStatus,
  getBooking,
  getBookingTimeline,
  overrideBookingPrice,
  updateBooking,
  type BookingDetail as Booking,
  type BookingPatch,
  type TimelineEvent,
} from "@/services/admin/bookings.service";

import {
  bookingErrorMessage,
  bookingStatusLabel,
  detailPaymentLabel,
  exceptionLabel,
  formatInstant,
  formatRupees,
  longDate,
  parseRupees,
  paymentMethodLabel,
  paymentStateLabel,
  refundDecisionLabel,
  rupeesInput,
  shortDate,
  slotText,
  sourceLabel,
} from "../utils/booking-format";
import {
  DetailList,
  InfoPanel,
  PageHeader,
  pagePadding,
  SegmentTabs,
  smallOutline,
  smallPrimary,
  StatusTag,
} from "./booking-ui";

type Tab = "overview" | "payments" | "history";

const E164 = /^\+[1-9]\d{6,14}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isOpen = (b: Booking) => b.status === "pending_payment" || b.status === "confirmed";
const canTakePayment = (b: Booking) => b.source === "office" && b.status === "pending_payment";
const paidAmount = (b: Booking) =>
  b.payments.filter((p) => p.status === "succeeded").reduce((sum, p) => sum + p.amount, 0);

/**
 * One booking: "The complete charter record." (admin Figma A11). Overview,
 * payments and history tabs, with the actions alongside. Data:
 * GET /admin/bookings/{id} and …/timeline; changes go through PATCH, …/notes,
 * …/status and …/price-override.
 */
export function BookingDetail({ bookingId }: { bookingId: string }) {
  const booking = useAdminQuery((signal) => getBooking(bookingId, signal), `booking:${bookingId}`);
  const timeline = useAdminQuery(
    (signal) => getBookingTimeline(bookingId, { limit: 100 }, signal),
    `timeline:${bookingId}`,
  );
  const [tab, setTab] = useState<Tab>("overview");
  const [notice, setNotice] = useState("");

  if (!booking.data) {
    return (
      <div className={pagePadding}>
        <LoadState
          loading={booking.loading}
          error={
            booking.error
              ? `Couldn't load the booking. ${bookingErrorMessage(booking.error)}`
              : undefined
          }
          onRetry={booking.reload}
          label="Loading booking"
        />
      </div>
    );
  }

  const b = booking.data;
  const name = b.customer?.full_name ?? b.contact.full_name;

  /** Shows the saved booking and refreshes the history. */
  const saved = (next: Booking, message: string) => {
    booking.setData(next);
    timeline.reload();
    setNotice(message);
  };

  return (
    <div className={pagePadding}>
      <PageHeader
        title="The complete charter record."
        subtitle={`Booking ${b.reference} · ${name}`}
      />

      <div className="mt-[20px] lg:mt-[26px]">
        <SegmentTabs
          label="Booking sections"
          value={tab}
          onChange={setTab}
          options={[
            { value: "overview", label: "Overview" },
            { value: "payments", label: "Payments" },
            { value: "history", label: "History" },
          ]}
        />
      </div>

      <PendingCancellationRequest bookingId={b.id} reference={b.reference} />
      {notice && <Notice className="mt-[18px] lg:max-w-[880px]">{notice}</Notice>}

      <div className="mt-[24px] grid gap-[28px] lg:mt-[30px] lg:grid-cols-[minmax(0,560px)_minmax(0,252px)] lg:gap-[28px]">
        <div className="min-w-0">
          {tab === "overview" && (
            <Overview
              booking={b}
              timeline={timeline.data?.items}
              onSaved={saved}
              onShowHistory={() => setTab("history")}
            />
          )}
          {tab === "payments" && <Payments booking={b} onSaved={saved} />}
          {tab === "history" && (
            <History
              events={timeline.data?.items}
              loading={timeline.loading}
              error={timeline.error ? bookingErrorMessage(timeline.error) : ""}
              onRetry={timeline.reload}
            />
          )}
        </div>
        <Actions booking={b} onSaved={saved} />
      </div>
    </div>
  );
}

/* Overview ----------------------------------------------------------- */

function Overview({
  booking: b,
  timeline,
  onSaved,
  onShowHistory,
}: {
  booking: Booking;
  timeline?: TimelineEvent[];
  onSaved: (b: Booking, message: string) => void;
  onShowHistory: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const extras = [
    `${b.guest_count} ${b.guest_count === 1 ? "guest" : "guests"}`,
    ...b.pricing.addons.map((a) => (a.quantity > 1 ? `${a.name} × ${a.quantity}` : a.name)),
  ].join(" · ");
  const paid = paidAmount(b);
  const latestPayment = b.payments[0];

  return (
    <>
      <div className="border border-[#dcdad5] bg-white px-[18px] py-[20px] lg:px-[22px]">
        <h2 className="text-[20px] leading-[26px] lg:text-[22px]">
          {b.yacht.name}
          {b.slot_type_name ? ` · ${b.slot_type_name}` : ""}
        </h2>
        <p className="mt-[8px] text-[12px] leading-[19px]" style={{ color: BODY }}>
          {longDate(b.date)} · {slotText(b)} · {b.time_zone}
          <br />
          {extras}
        </p>
      </div>

      <div className="mt-[20px] flex flex-col gap-[10px]">
        <StatusTag>Booking {bookingStatusLabel(b.status).toLowerCase()}</StatusTag>
        <StatusTag>Payment {detailPaymentLabel(b).toLowerCase()}</StatusTag>
        {b.status === "pending_payment" && b.hold_expires_at && (
          <p className="text-[11px]" style={{ color: BODY }}>
            The slot is held for payment until {formatInstant(b.hold_expires_at)}.
          </p>
        )}
      </div>

      {editing ? (
        <EditDetails
          booking={b}
          onCancel={() => setEditing(false)}
          onSaved={(next) => {
            setEditing(false);
            onSaved(next, "Booking details saved.");
          }}
        />
      ) : (
        <>
          <DetailList
            className="mt-[24px]"
            items={[
              ["Lead guest", b.contact.full_name],
              ["Email", b.contact.email],
              ["Contact", b.contact.phone ?? "—"],
              [paid ? "Total paid" : "Total due", formatRupees(paid || b.total_amount)],
              ["Source", sourceLabel(b.source)],
              ...(b.partner ? [["Partner", b.partner.name] as [string, ReactNode]] : []),
              ...(b.special_requests
                ? [["Special requests", b.special_requests] as [string, ReactNode]]
                : []),
            ]}
          />
          {isOpen(b) && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="mt-[16px] text-[11px] underline-offset-2 hover:underline"
            >
              Edit guest details
            </button>
          )}
        </>
      )}

      {/* Payment and refund entries */}
      <table className="mt-[24px] w-full border-collapse text-left text-[12px]">
        <caption className="sr-only">Payment and refund entries</caption>
        <thead style={{ backgroundColor: SAND }}>
          <tr className="text-[10px]" style={{ color: MUTED }}>
            {["Entry", "Amount", "State"].map((h) => (
              <th key={h} scope="col" className="h-[40px] w-1/3 px-[13px] font-normal">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white">
          <tr className="border-b border-[#e3e1dc]">
            <th scope="row" className="h-[44px] px-[13px] font-normal">
              {latestPayment ? paymentEntryName(latestPayment) : "Payment"}
            </th>
            <td className="px-[13px]">{formatRupees(latestPayment?.amount ?? b.total_amount)}</td>
            <td className="px-[13px]">
              {latestPayment ? paymentStateLabel(latestPayment.status) : "Not started"}
            </td>
          </tr>
          <tr className="border-b border-[#e3e1dc]">
            <th scope="row" className="h-[44px] px-[13px] font-normal">
              Refunds
            </th>
            <td className="px-[13px]">{formatRupees(b.cancellation?.refund_amount ?? 0)}</td>
            <td className="px-[13px]">
              {b.status === "refunded"
                ? "Refunded"
                : b.cancellation && b.cancellation.refund_amount > 0
                  ? "Refund pending"
                  : "No refund"}
            </td>
          </tr>
        </tbody>
      </table>

      <NoteForm booking={b} onSaved={onSaved} />

      {/* Latest history */}
      {timeline && timeline.length > 0 && (
        <div className="mt-[28px]">
          <TimelineList events={timeline.slice(0, 3)} />
          {timeline.length > 3 && (
            <button
              type="button"
              onClick={onShowHistory}
              className="mt-[14px] text-[11px] hover:underline"
            >
              See the full history ({timeline.length} entries)
            </button>
          )}
        </div>
      )}
    </>
  );
}

const paymentEntryName = (p: Booking["payments"][number]) =>
  p.reference ?? p.provider_payment_id ?? `PAY-${p.id.slice(0, 8).toUpperCase()}`;

function NoteForm({
  booking: b,
  onSaved,
}: {
  booking: Booking;
  onSaved: (b: Booking, message: string) => void;
}) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!body.trim()) {
      setError("Write the note first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const note = await addBookingNote(b.id, body.trim());
      onSaved({ ...b, notes: [note, ...b.notes] }, "Internal note saved.");
      setBody("");
    } catch (err) {
      setError(bookingErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} noValidate className="mt-[28px]">
      <Label htmlFor="booking-note">Internal note</Label>
      <textarea
        id="booking-note"
        value={body}
        maxLength={2000}
        rows={2}
        onChange={(e) => setBody(e.currentTarget.value)}
        placeholder="Visible to authorised staff only."
        className={`${input} h-auto min-h-[52px] py-[14px] lg:max-w-[364px]`}
        {...errorProps("booking-note", error)}
      />
      <FieldError id="booking-note" message={error} />
      <button
        type="submit"
        disabled={busy}
        className={cx(smallOutline, "mt-[20px] w-[136px]")}
        style={OUTLINE_STYLE}
      >
        {busy ? "Saving…" : "Save internal note"}
      </button>
      {b.notes.length > 0 && (
        <ul className="mt-[18px] flex flex-col gap-[10px] lg:max-w-[560px]">
          {b.notes.map((n) => (
            <li
              key={n.id}
              className="border-l-2 border-[#dcdad5] pl-[12px] text-[12px] leading-[18px]"
            >
              <p className="whitespace-pre-line">{n.body}</p>
              <p className="mt-[2px] text-[10px]" style={{ color: MUTED }}>
                {n.author.name} · {formatInstant(n.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}

function EditDetails({
  booking: b,
  onCancel,
  onSaved,
}: {
  booking: Booking;
  onCancel: () => void;
  onSaved: (b: Booking) => void;
}) {
  const [name, setName] = useState(b.contact.full_name);
  const [email, setEmail] = useState(b.contact.email);
  const [phone, setPhone] = useState(b.contact.phone ?? "");
  const [guests, setGuests] = useState(String(b.guest_count));
  const [requests, setRequests] = useState(b.special_requests ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    const cleanPhone = phone.replace(/[\s()-]/g, "");
    const count = Number(guests);
    if (!name.trim()) next.name = "Enter the lead guest's name.";
    if (!EMAIL.test(email.trim())) next.email = "Enter a valid email address.";
    if (cleanPhone && !E164.test(cleanPhone))
      next.phone = "Use the international format, e.g. +919876543210.";
    if (!Number.isInteger(count) || count < 1) next.guests = "Enter the number of guests.";
    setErrors(next);
    if (Object.keys(next).length) return;

    const patch: BookingPatch = {
      ...(name.trim() !== b.contact.full_name ? { contact_name: name.trim() } : {}),
      ...(email.trim() !== b.contact.email ? { contact_email: email.trim() } : {}),
      ...(cleanPhone !== (b.contact.phone ?? "") ? { contact_phone: cleanPhone || null } : {}),
      ...(count !== b.guest_count ? { guest_count: count } : {}),
      ...(requests.trim() !== (b.special_requests ?? "")
        ? { special_requests: requests.trim() || null }
        : {}),
    };
    if (!Object.keys(patch).length) {
      onCancel();
      return;
    }
    setBusy(true);
    setFailure("");
    try {
      onSaved(await updateBooking(b.id, patch));
    } catch (err) {
      setFailure(bookingErrorMessage(err));
      setBusy(false);
    }
  }

  const field = (
    id: string,
    label: string,
    value: string,
    set: (v: string) => void,
    opts: { type?: string; error?: string; required?: boolean } = {},
  ) => (
    <div>
      <Label htmlFor={id} required={opts.required}>
        {label}
      </Label>
      <input
        id={id}
        type={opts.type ?? "text"}
        value={value}
        onChange={(e) => set(e.currentTarget.value)}
        className={input}
        {...errorProps(id, opts.error)}
      />
      <FieldError id={id} message={opts.error} />
    </div>
  );

  return (
    <form
      onSubmit={save}
      noValidate
      className="mt-[24px] border border-[#dcdad5] bg-white p-[18px] lg:p-[22px]"
    >
      <h2 className="text-[18px]">Edit guest details</h2>
      <div className="mt-[18px] grid gap-[18px] sm:grid-cols-2">
        {field("edit-name", "Lead guest name", name, setName, {
          error: errors.name,
          required: true,
        })}
        {field("edit-email", "Email", email, setEmail, {
          type: "email",
          error: errors.email,
          required: true,
        })}
        {field("edit-phone", "Contact", phone, setPhone, { type: "tel", error: errors.phone })}
        {field("edit-guests", "Number of guests", guests, setGuests, {
          type: "number",
          error: errors.guests,
          required: true,
        })}
        <div className="sm:col-span-2">
          <Label htmlFor="edit-requests">Special requests</Label>
          <textarea
            id="edit-requests"
            value={requests}
            maxLength={2000}
            rows={3}
            onChange={(e) => setRequests(e.currentTarget.value)}
            className={`${input} h-auto py-[14px]`}
          />
        </div>
      </div>
      <p className="mt-[12px] text-[11px]" style={{ color: BODY }}>
        The guest count can change only if the price stays the same.
      </p>
      {failure && (
        <Notice tone="error" className="mt-[14px]">
          {failure}
        </Notice>
      )}
      <div className="mt-[18px] flex flex-wrap gap-[12px]">
        <button type="submit" disabled={busy} className={smallPrimary} style={PRIMARY_STYLE}>
          {busy ? "Saving…" : "Save details"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className={smallOutline}
          style={OUTLINE_STYLE}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

/* Payments ----------------------------------------------------------- */

function Payments({
  booking: b,
  onSaved,
}: {
  booking: Booking;
  onSaved: (b: Booking, message: string) => void;
}) {
  const { admin } = useAdminSession();
  const p = b.pricing;
  const priceRows: [string, string][] = [
    ...(p.charter_amount !== null
      ? [["Charter", formatRupees(p.charter_amount)] as [string, string]]
      : []),
    ...p.addons.map((a): [string, string] => [`${a.name} × ${a.quantity}`, formatRupees(a.amount)]),
    ["Subtotal", formatRupees(p.subtotal)],
    [`${p.tax_label}${p.tax_rate !== null ? ` (${p.tax_rate}%)` : ""}`, formatRupees(p.tax_amount)],
  ];

  return (
    <>
      <div className="border border-[#dcdad5] bg-white px-[18px] py-[16px] text-[12px]">
        <p className="text-[10px] tracking-[0.12em] uppercase" style={{ color: MUTED }}>
          Price
        </p>
        <dl className="mt-[8px]">
          {priceRows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-[12px] py-[4px]">
              <dt style={{ color: BODY }}>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
          <div className="mt-[6px] flex justify-between gap-[12px] border-t border-[#eceae6] pt-[8px] text-[14px]">
            <dt>Total</dt>
            <dd>{formatRupees(p.total_amount)}</dd>
          </div>
        </dl>
        {b.price_override && (
          <p className="mt-[10px] text-[11px]" style={{ color: BODY }}>
            Price changed by hand on {formatInstant(b.price_override.at)} (was{" "}
            {formatRupees(b.price_override.original_total_amount)}): {b.price_override.reason}
          </p>
        )}
      </div>

      {b.partner && (
        <DetailList
          className="mt-[22px]"
          items={[
            ["Partner", b.partner.name],
            [
              "Commission",
              b.commission.rate !== null
                ? `${b.commission.rate}% · ${formatRupees(b.commission.amount)}`
                : "Set when confirmed",
            ],
            ["Partner payable", formatRupees(b.commission.partner_payable)],
          ]}
        />
      )}
      <DetailList
        className="mt-[22px]"
        items={[
          [
            "Invoice",
            b.invoice
              ? (b.invoice.invoice_number ??
                (b.invoice.status === "pending_configuration"
                  ? "Waiting for invoice settings"
                  : "Being generated"))
              : "None yet",
          ],
          ...(b.cancellation
            ? [
                [
                  "Refund decided",
                  `${refundDecisionLabel(b.cancellation.refund_decision)} · ${formatRupees(b.cancellation.refund_amount)}`,
                ] as [string, ReactNode],
              ]
            : []),
        ]}
      />

      <h2 className="mt-[30px] text-[18px]">Payment attempts</h2>
      {b.payments.length === 0 ? (
        <p className="mt-[10px] text-[13px]" style={{ color: BODY }}>
          No payments yet.
        </p>
      ) : (
        <ul className="mt-[12px] flex flex-col gap-[12px]">
          {b.payments.map((pay) => (
            <li key={pay.id} className="border border-[#dcdad5] bg-white px-[18px] py-[16px]">
              <div className="flex flex-wrap items-baseline justify-between gap-[8px]">
                <h3 className="text-[16px]">{paymentEntryName(pay)}</h3>
                <span className="text-[13px]">{formatRupees(pay.amount)}</span>
              </div>
              <DetailList
                className="mt-[10px]"
                items={[
                  ["State", paymentStateLabel(pay.status)],
                  ["Method", paymentMethodLabel(pay.method)],
                  ...(pay.received_on
                    ? [["Received on", longDate(pay.received_on)] as [string, ReactNode]]
                    : []),
                  ...(pay.captured_at
                    ? [["Captured", formatInstant(pay.captured_at)] as [string, ReactNode]]
                    : []),
                  ...(pay.failure_description
                    ? [["Failure", pay.failure_description] as [string, ReactNode]]
                    : []),
                  ["Started", formatInstant(pay.created_at)],
                ]}
              />
              {pay.exception_reason && (
                <Notice tone="error" className="mt-[12px]">
                  Needs review: {exceptionLabel(pay.exception_reason)}. Decide with the customer,
                  then refund on Payments & refunds if needed.
                </Notice>
              )}
              <Link
                href={
                  pay.status === "succeeded"
                    ? adminRoutes.refundNew(pay.id)
                    : adminRoutes.refundPayment(pay.id)
                }
                className="mt-[12px] inline-block text-[12px] underline underline-offset-2"
              >
                {pay.status === "succeeded" ? "Refund this payment" : "View payment details"}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {(b.refunds?.length ?? 0) > 0 && (
        <>
          <h3 className="mt-[26px] text-[18px] leading-[24px]">Refunds</h3>
          <ul className="mt-[10px] flex flex-col gap-[10px]">
            {b.refunds!.map((r) => (
              <li
                key={r.id}
                className="border border-[#dcdad5] bg-white px-[18px] py-[14px] text-[13px]"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-[8px]">
                  <span>
                    {formatRupees(r.amount)} · {refundStatusLabel(r.status)}
                  </span>
                  <Link
                    href={adminRoutes.refundPayment(r.payment_id)}
                    className="text-[12px] underline underline-offset-2"
                  >
                    Payment
                  </Link>
                </div>
                <p className="mt-[4px] text-[12px]" style={{ color: BODY }}>
                  {refundChannelText(r.channel)} · {r.reason} · {formatInstant(r.created_at)}
                  {r.failure_description ? ` · failed: ${r.failure_description}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}

      {canTakePayment(b) && (
        <Link
          href={adminRoutes.bookingPayment(b.id)}
          className={cx(smallPrimary, "mt-[20px] w-fit")}
          style={PRIMARY_STYLE}
        >
          Record payment or send link
        </Link>
      )}

      {admin?.role === "super_admin" && canTakePayment(b) && (
        <PriceOverride booking={b} onSaved={onSaved} />
      )}
    </>
  );
}

function PriceOverride({
  booking: b,
  onSaved,
}: {
  booking: Booking;
  onSaved: (b: Booking, message: string) => void;
}) {
  const [amount, setAmount] = useState(rupeesInput(b.pricing.charter_amount ?? 0));
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    const paise = parseRupees(amount);
    const next: Record<string, string> = {};
    if (Number.isNaN(paise)) next.amount = "Enter the new charter price, e.g. 90000.";
    if (!reason.trim()) next.reason = "Give a reason; it is kept in the history.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    setFailure("");
    try {
      const saved = await overrideBookingPrice(b.id, {
        charter_amount: paise,
        reason: reason.trim(),
      });
      onSaved(saved, `Price changed. New total ${formatRupees(saved.total_amount)}.`);
      setReason("");
    } catch (err) {
      setFailure(bookingErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={save}
      noValidate
      className="mt-[30px] border border-[#dcdad5] bg-white p-[18px]"
    >
      <h2 className="text-[18px]">Change the price</h2>
      <p className="mt-[6px] text-[11px] leading-[17px]" style={{ color: BODY }}>
        Super administrators only, before payment. The charter price excludes GST; add-ons keep
        their price and GST is added at the booking’s rate.
      </p>
      <div className="mt-[16px] grid gap-[16px] sm:grid-cols-2">
        <div>
          <Label htmlFor="override-amount" required>
            New charter price (₹, before GST)
          </Label>
          <input
            id="override-amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.currentTarget.value)}
            className={input}
            {...errorProps("override-amount", errors.amount)}
          />
          <FieldError id="override-amount" message={errors.amount} />
        </div>
        <div>
          <Label htmlFor="override-reason" required>
            Reason
          </Label>
          <input
            id="override-reason"
            value={reason}
            maxLength={1000}
            onChange={(e) => setReason(e.currentTarget.value)}
            placeholder="e.g. Repeat customer discount"
            className={input}
            {...errorProps("override-reason", errors.reason)}
          />
          <FieldError id="override-reason" message={errors.reason} />
        </div>
      </div>
      {failure && (
        <Notice tone="error" className="mt-[14px]">
          {failure}
        </Notice>
      )}
      <button
        type="submit"
        disabled={busy}
        className={cx(smallOutline, "mt-[16px]")}
        style={OUTLINE_STYLE}
      >
        {busy ? "Saving…" : "Save new price"}
      </button>
    </form>
  );
}

/* History ------------------------------------------------------------ */

function History({
  events,
  loading,
  error,
  onRetry,
}: {
  events?: TimelineEvent[];
  loading: boolean;
  error: string;
  onRetry: () => void;
}) {
  if (!events) {
    return (
      <LoadState
        loading={loading}
        error={error ? `Couldn't load the history. ${error}` : undefined}
        onRetry={onRetry}
        label="Loading history"
      />
    );
  }
  if (!events.length)
    return (
      <p className="text-[13px]" style={{ color: BODY }}>
        No history yet.
      </p>
    );
  return <TimelineList events={events} />;
}

function TimelineList({ events }: { events: TimelineEvent[] }) {
  return (
    <ol>
      {events.map((e, i) => (
        <li key={`${e.at}-${i}`} className="border-b border-[#dcdad5] py-[14px] first:pt-0">
          <p className="text-[10px]" style={{ color: MUTED }}>
            {String(i + 1).padStart(2, "0")} / {e.summary}
          </p>
          <p className="mt-[6px] text-[12px] leading-[18px]">
            {shortDate(formatDateKey(e.at))} · {e.actor ? e.actor.name : "Customer or system"}
            {detailText(e) && <span style={{ color: BODY }}> · {detailText(e)}</span>}
          </p>
        </li>
      ))}
    </ol>
  );
}

/** The event's local date, "YYYY-MM-DD". */
const formatDateKey = (iso: string) =>
  new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

/** A short line from the event's details: an amount, a note or a reason. */
function detailText(e: TimelineEvent): string {
  const d = e.details;
  if (!d) return "";
  if (typeof d.amount === "number") return `${formatRupees(d.amount)}`;
  for (const key of ["reason", "body", "note"])
    if (typeof d[key] === "string") return String(d[key]).slice(0, 140);
  return "";
}

/* Actions ------------------------------------------------------------ */

function Actions({
  booking: b,
  onSaved,
}: {
  booking: Booking;
  onSaved: (b: Booking, message: string) => void;
}) {
  const [confirming, setConfirming] = useState<"completed" | "no_show" | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  // The time the page opened: enough to know whether the charter started or ended.
  const [now] = useState(() => Date.now());
  const started = now >= new Date(b.starts_at).getTime();
  const ended = now >= new Date(b.ends_at).getTime();
  const refundDue =
    b.needs_review ||
    Boolean(b.cancellation && b.cancellation.refund_amount > 0 && b.status !== "refunded");

  async function close(status: "completed" | "no_show") {
    setBusy(true);
    setFailure("");
    try {
      const saved = await changeBookingStatus(b.id, status);
      setConfirming(null);
      onSaved(saved, status === "completed" ? "Marked as completed." : "Marked as a no-show.");
    } catch (err) {
      setFailure(bookingErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const action = (content: ReactNode, key: string) => <li key={key}>{content}</li>;
  const items: ReactNode[] = [];
  if (isOpen(b))
    items.push(
      action(
        <Link
          href={adminRoutes.bookingReschedule(b.id)}
          className={cx(smallPrimary, "w-[160px]")}
          style={PRIMARY_STYLE}
        >
          Reschedule charter
        </Link>,
        "reschedule",
      ),
      action(
        <Link
          href={adminRoutes.bookingCancel(b.id)}
          className={cx(smallOutline, "w-[160px]")}
          style={OUTLINE_STYLE}
        >
          Review cancellation
        </Link>,
        "cancel",
      ),
    );
  if (canTakePayment(b))
    items.push(
      action(
        <Link
          href={adminRoutes.bookingPayment(b.id)}
          className={cx(smallOutline, "w-[160px]")}
          style={OUTLINE_STYLE}
        >
          Take payment
        </Link>,
        "pay",
      ),
    );
  if (refundDue)
    items.push(
      action(
        <Link
          href={adminRoutes.refunds}
          className={cx(smallOutline, "w-[160px]")}
          style={OUTLINE_STYLE}
        >
          Process a refund
        </Link>,
        "refund",
      ),
    );
  if (b.status === "confirmed" && started)
    items.push(
      action(
        confirming ? (
          <div className="flex flex-col gap-[8px]">
            <p className="text-[11px]" style={{ color: BODY }}>
              Mark {b.reference} as {confirming === "completed" ? "completed" : "a no-show"}? This
              can’t be undone.
            </p>
            <div className="flex gap-[8px]">
              <button
                type="button"
                disabled={busy}
                onClick={() => close(confirming)}
                className={smallPrimary}
                style={PRIMARY_STYLE}
              >
                {busy ? "Saving…" : "Confirm"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirming(null)}
                className={smallOutline}
                style={OUTLINE_STYLE}
              >
                Back
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-[10px]">
            {ended && (
              <button
                type="button"
                onClick={() => setConfirming("completed")}
                className={cx(smallOutline, "w-[160px]")}
                style={OUTLINE_STYLE}
              >
                Mark completed
              </button>
            )}
            <button
              type="button"
              onClick={() => setConfirming("no_show")}
              className={cx(smallOutline, "w-[160px]")}
              style={OUTLINE_STYLE}
            >
              Mark no-show
            </button>
          </div>
        ),
        "close",
      ),
    );
  if (b.customer)
    items.push(
      action(
        <Link
          href={adminRoutes.customer(b.customer.id)}
          className="flex h-[40px] w-[160px] items-center justify-center text-[11px] hover:underline"
        >
          View customer
        </Link>,
        "customer",
      ),
    );

  return (
    <aside aria-label="Booking actions" className="flex flex-col gap-[16px]">
      {items.length > 0 && <ul className="flex flex-col gap-[14px]">{items}</ul>}
      {failure && <Notice tone="error">{failure}</Notice>}
      {b.cancellation && (
        <InfoPanel title="Cancelled">
          {formatInstant(b.cancellation.at)}: {b.cancellation.reason}
          <br />
          {refundDecisionLabel(b.cancellation.refund_decision)} ·{" "}
          {formatRupees(b.cancellation.refund_amount)}
        </InfoPanel>
      )}
      <InfoPanel title="Records stay separate">
        Booking, payment and refund statuses have independent histories. All changes require a
        reason and leave an audit entry.
      </InfoPanel>
      <p className="text-[10px]" style={{ color: INK }}>
        Created {formatInstant(b.created_at)}
      </p>
    </aside>
  );
}

/** A banner when the customer has asked to cancel and nobody has decided yet. */
function PendingCancellationRequest({
  bookingId,
  reference,
}: {
  bookingId: string;
  reference: string;
}) {
  const pending = useAdminQuery(
    (signal) =>
      listCancellationRequests({ status: "pending", search: reference, limit: 5 }, signal).then(
        (list) => list.items.find((r) => r.booking.id === bookingId) ?? null,
      ),
    `pending-cancel:${bookingId}`,
  );
  if (!pending.data) return null;
  return (
    <Notice tone="error" className="mt-[18px] lg:max-w-[880px]">
      The customer asked to cancel this booking on {formatInstant(pending.data.requested_at)}.{" "}
      <Link
        href={adminRoutes.cancellationRequest(pending.data.id)}
        className="underline underline-offset-2"
      >
        Review the request
      </Link>
    </Notice>
  );
}
