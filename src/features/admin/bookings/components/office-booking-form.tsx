"use client";

import { ArrowLeft, ArrowRight, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { BODY, INK, MUTED } from "@/components/admin/admin-theme";
import {
  errorProps,
  FieldError,
  input,
  Label,
  Notice,
  PRIMARY_STYLE,
  SelectBox,
} from "@/components/admin/form-parts";
import { searchYachts } from "@/components/admin/lookups";
import { SearchSelect } from "@/components/admin/search-select";
import { adminRoutes } from "@/constants/routes";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { cx } from "@/lib/cx";
import {
  addBookingNote,
  createOfficeBooking,
  getYachtCalendar,
  issuePaymentLink,
  listYachtAddons,
  quoteOfficeBooking,
  recordOfficePayment,
  searchCustomers,
  updateBooking,
  type BookingDetail,
  type CustomerOption,
  type OfficeBookingInput,
  type Quote,
} from "@/services/admin/bookings.service";
import type { Yacht } from "@/services/admin/fleet.service";

import {
  bookingErrorMessage,
  durationText,
  formatRupees,
  longDate,
  marinaToday,
  slotText,
} from "../utils/booking-format";
import {
  formGrid,
  InfoPanel,
  PageHeader,
  pagePadding,
  smallOutline,
  smallPrimary,
} from "./booking-ui";
import { LinkFailure, PaymentChoice, type OfflinePaymentInput } from "./payment-choice";

const E164 = /^\+[1-9]\d{6,14}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalisePhone = (phone: string) => phone.replace(/[\s()-]/g, "");

interface Contact {
  name: string;
  email: string;
  phone: string;
}

/**
 * New office booking: "A charter, personally arranged." (admin Figma A09),
 * then "A clear payment record." (A10) once the price is reviewed. Uses the
 * same availability and price checks as online booking: the slots come from
 * GET /admin/calendar, the price from POST /pricing/quote, and
 * POST /admin/bookings rechecks both.
 */
export function OfficeBookingForm() {
  const router = useRouter();
  const today = marinaToday();

  // Customer
  const [customerQuery, setCustomerQuery] = useState("");
  const [customer, setCustomer] = useState<CustomerOption | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [contact, setContact] = useState<Contact>({ name: "", email: "", phone: "" });

  // Charter
  const [yachtId, setYachtId] = useState("");
  const [yacht, setYacht] = useState<Yacht | null>(null);
  const [date, setDate] = useState("");
  const [slotKey, setSlotKey] = useState("");
  const [guests, setGuests] = useState("");
  const [addons, setAddons] = useState<Record<string, number>>({});
  const [note, setNote] = useState("");

  /** Set by the first review: from then on, field errors follow the fields as they change. */
  const [submitted, setSubmitted] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [failure, setFailure] = useState("");
  const [quote, setQuote] = useState<Quote | null>(null);
  /** The booking, once created (pending) while sending a payment link. */
  const [created, setCreated] = useState<BookingDetail | null>(null);

  const calendar = useAdminQuery(
    (signal) =>
      yachtId && date ? getYachtCalendar(yachtId, date, date, signal) : Promise.resolve(null),
    `free:${yachtId}:${date}`,
  );
  const addonList = useAdminQuery(
    (signal) => (yachtId ? listYachtAddons(yachtId, signal) : Promise.resolve([])),
    `addons:${yachtId}`,
  );

  const windows = (calendar.data?.free_windows ?? []).filter((w) => w.date === date);
  const slot = windows.find((w) => `${w.slot_type_id}@${w.start_time}` === slotKey);

  const setField = (key: keyof Contact) => (value: string) =>
    setContact((c) => ({ ...c, [key]: value }));

  function chooseCustomer(c: CustomerOption) {
    setCustomer(c);
    setIsNew(false);
    setCustomerQuery(`${c.full_name} · ${c.email}`);
    setContact({ name: c.full_name, email: c.email, phone: c.phone ?? "" });
  }

  function chooseNew() {
    setCustomer(null);
    setIsNew(true);
    const typed = customerQuery.trim();
    setContact({
      name: typed && !typed.includes("@") ? typed : "",
      email: typed.includes("@") ? typed : "",
      phone: "",
    });
  }

  function selection(): Pick<
    OfficeBookingInput,
    "yacht_id" | "slot_type_id" | "date" | "start_time" | "guests" | "addons"
  > | null {
    if (!slot) return null;
    const chosen = Object.entries(addons)
      .filter(([, qty]) => qty > 0)
      .map(([addon_id, quantity]) => ({ addon_id, quantity }));
    return {
      yacht_id: yachtId,
      slot_type_id: slot.slot_type_id,
      date,
      start_time: slot.start_time,
      guests: Number(guests),
      ...(chosen.length ? { addons: chosen } : {}),
    };
  }

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};
    if (!customer && !isNew)
      next.customer = "Find an existing customer, or choose “Add new customer”.";
    if (!contact.name.trim()) next.name = "Enter the lead guest's name.";
    if (!EMAIL.test(contact.email.trim())) next.email = "Enter a valid email address.";
    const phone = normalisePhone(contact.phone);
    if (!phone) next.phone = "Enter a phone number.";
    else if (!E164.test(phone)) next.phone = "Use the international format, e.g. +919876543210.";
    if (!yachtId) next.yacht = "Choose a yacht.";
    if (!date) next.date = "Choose the departure date.";
    else if (date < today) next.date = "The departure date can't be in the past.";
    if (!slot) next.slot = "Choose a free slot.";
    const count = Number(guests);
    if (!Number.isInteger(count) || count < 1) next.guests = "Enter the number of guests.";
    else if (yacht?.capacity && count > yacht.capacity)
      next.guests = `${yacht.name} takes up to ${yacht.capacity} guests.`;
    return next;
  }

  async function review(event: FormEvent) {
    event.preventDefault();
    const next = validate();
    setSubmitted(true);
    setFailure("");
    if (Object.keys(next).length) {
      document.getElementById(`field-${Object.keys(next)[0]}`)?.focus();
      return;
    }
    setReviewing(true);
    try {
      setQuote(await quoteOfficeBooking(selection()!));
      window.scrollTo({ top: 0 });
    } catch (error) {
      setFailure(bookingErrorMessage(error));
      calendar.reload();
    } finally {
      setReviewing(false);
    }
  }

  function bookingInput(): OfficeBookingInput {
    const phone = normalisePhone(contact.phone);
    return {
      ...selection()!,
      expected_total_amount: quote!.total_amount,
      ...(customer
        ? { customer_id: customer.id }
        : {
            customer: {
              full_name: contact.name.trim(),
              email: contact.email.trim(),
              phone: phone || null,
            },
          }),
    };
  }

  /**
   * Saves what POST /admin/bookings doesn't take: the internal note, and the
   * lead guest's details when they differ from the chosen customer's account.
   * Failures here don't undo the booking, so they are ignored.
   */
  async function afterCreate(booking: BookingDetail, extraNote?: string) {
    const notes = [note.trim(), extraNote?.trim()].filter(Boolean) as string[];
    await Promise.allSettled(notes.map((body) => addBookingNote(booking.id, body)));
    if (customer) {
      const phone = normalisePhone(contact.phone);
      const patch = {
        ...(contact.name.trim() !== booking.contact.full_name
          ? { contact_name: contact.name.trim() }
          : {}),
        ...(contact.email.trim() !== booking.contact.email
          ? { contact_email: contact.email.trim() }
          : {}),
        ...(phone !== (booking.contact.phone ?? "") ? { contact_phone: phone || null } : {}),
      };
      if (Object.keys(patch).length) await updateBooking(booking.id, patch).catch(() => {});
    }
  }

  async function recordOffline(payment: OfflinePaymentInput) {
    const { method, reference, received_on } = payment;
    if (created) {
      // Already created as pending (a link was tried first): record against it.
      await recordOfficePayment(created.id, {
        method,
        reference,
        received_on,
        amount: payment.amount,
      });
      await afterCreate(created, payment.note);
      router.push(adminRoutes.booking(created.id));
      return;
    }
    const booking = await createOfficeBooking({
      ...bookingInput(),
      payment: { method, received_on, ...(reference ? { reference } : {}) },
    });
    await afterCreate(booking, payment.note);
    router.push(adminRoutes.booking(booking.id));
  }

  async function sendLink() {
    let booking = created;
    if (!booking) {
      booking = await createOfficeBooking(bookingInput());
      setCreated(booking);
      await afterCreate(booking);
    }
    try {
      return { link: await issuePaymentLink(booking.id), bookingId: booking.id };
    } catch (error) {
      throw new LinkFailure(error, booking.id);
    }
  }

  const errors: Record<string, string> = submitted ? validate() : {};

  /* Step 2: payment ------------------------------------------------- */

  if (quote && yacht) {
    return (
      <div className={pagePadding}>
        <PageHeader
          title="A clear payment record."
          subtitle={`Office booking · ${yacht.name} · ${longDate(quote.slot.date).replace(/ \d{4}$/, "")} · Total ${formatRupees(quote.total_amount)}`}
        />
        <QuoteSummary quote={quote} />
        <PaymentChoice
          total={quote.total_amount}
          customer={{ name: contact.name.trim(), email: contact.email.trim() }}
          onRecordOffline={recordOffline}
          onSendLink={sendLink}
        />
        {!created && (
          <button
            type="button"
            onClick={() => setQuote(null)}
            className="mt-[20px] flex items-center gap-[6px] text-[11px] hover:underline"
          >
            <ArrowLeft aria-hidden="true" className="size-[12px]" /> Change booking details
          </button>
        )}
      </div>
    );
  }

  /* Step 1: details -------------------------------------------------- */

  const slotOptions = [
    {
      value: "",
      label: !yachtId
        ? "Choose a yacht first"
        : !date
          ? "Choose a date first"
          : calendar.loading
            ? "Checking free slots…"
            : windows.length
              ? "Choose a slot"
              : "No free slots on this date",
    },
    ...windows.map((w) => ({
      value: `${w.slot_type_id}@${w.start_time}`,
      label: `${durationText(w.start_time, w.end_time) || w.slot_type_name} · ${slotText(w)}`,
    })),
  ];

  return (
    <div className={pagePadding}>
      <PageHeader
        title="A charter, personally arranged."
        subtitle="Create an office booking with the same availability checks as online booking."
      />

      <form onSubmit={review} noValidate className="mt-[24px] lg:mt-[30px]">
        <div className={formGrid}>
          {/* Customer search */}
          <div className="relative">
            <Label htmlFor="field-customer" required>
              Customer
            </Label>
            <SearchSelect<CustomerOption>
              id="field-customer"
              value={customer?.id ?? ""}
              selectedLabel={customer ? `${customer.full_name} · ${customer.email}` : undefined}
              onChange={(_, option) => {
                if (option?.data) chooseCustomer(option.data);
                else {
                  setCustomer(null);
                  setCustomerQuery("");
                }
              }}
              onSearchChange={setCustomerQuery}
              load={async (search, signal) => {
                const list = await searchCustomers(search.slice(0, 100), signal);
                return {
                  options: list.map((c) => ({
                    value: c.id,
                    label: c.full_name,
                    description: [c.email, c.phone].filter(Boolean).join(" · "),
                    data: c,
                  })),
                  hasMore: list.length >= 8,
                };
              }}
              clearable
              emptyLabel={isNew ? "New customer · details below" : undefined}
              placeholder="Find existing customer by name, email or phone"
              noResults="No customer matches."
              invalid={errors.customer}
              actions={[
                {
                  label: (
                    <>
                      <Plus aria-hidden="true" className="size-[13px]" /> Add new customer
                    </>
                  ),
                  onSelect: chooseNew,
                },
              ]}
            />
            <FieldError id="field-customer" message={errors.customer} />
            {(customer || isNew) && (
              <p className="mt-[6px] text-[11px]" style={{ color: BODY }}>
                {customer
                  ? "Existing customer. The booking is added to their account."
                  : "New customer, created with the booking. They can sign in after registering with this email."}
              </p>
            )}
          </div>

          <TextField
            id="field-name"
            label="Lead guest name"
            value={contact.name}
            onChange={setField("name")}
            error={errors.name}
            maxLength={255}
            placeholder="e.g. Ananya Menon"
          />
          <TextField
            id="field-email"
            label="Email"
            type="email"
            value={contact.email}
            onChange={setField("email")}
            error={errors.email}
            placeholder="name@example.com"
          />
          <TextField
            id="field-phone"
            label="Phone"
            type="tel"
            value={contact.phone}
            onChange={setField("phone")}
            error={errors.phone}
            placeholder="+91 98765 43210"
          />

          <div>
            <Label htmlFor="field-yacht" required>
              Yacht
            </Label>
            <SearchSelect<Yacht>
              id="field-yacht"
              value={yachtId}
              onChange={(v, option) => {
                setYachtId(v);
                setYacht(option?.data ?? null);
                setSlotKey("");
                setAddons({});
              }}
              load={searchYachts({ status: "active" })}
              placeholder="Search active yachts by name"
              noResults="No active yacht matches."
              invalid={errors.yacht}
            />
            <FieldError id="field-yacht" message={errors.yacht} />
          </div>
          <div>
            <Label htmlFor="field-date" required>
              Departure
            </Label>
            <input
              id="field-date"
              type="date"
              value={date}
              min={today}
              onChange={(e) => {
                setDate(e.currentTarget.value);
                setSlotKey("");
              }}
              className={input}
              {...errorProps("field-date", errors.date)}
            />
            <FieldError id="field-date" message={errors.date} />
          </div>

          <div>
            <Label htmlFor="field-slot" required>
              Duration / slot
            </Label>
            <SelectBox
              id="field-slot"
              value={slotKey}
              onChange={setSlotKey}
              options={slotOptions}
              disabled={!yachtId || !date || calendar.loading}
              invalid={errors.slot}
            />
            <FieldError
              id="field-slot"
              message={
                errors.slot ??
                (calendar.error
                  ? `Couldn't check free slots. ${bookingErrorMessage(calendar.error)}`
                  : undefined)
              }
            />
          </div>
          <div>
            <Label
              htmlFor="field-guests"
              required
              hint={yacht?.capacity ? `up to ${yacht.capacity}` : undefined}
            >
              Number of guests
            </Label>
            <input
              id="field-guests"
              type="number"
              inputMode="numeric"
              min={1}
              max={yacht?.capacity ?? undefined}
              value={guests}
              onChange={(e) => setGuests(e.currentTarget.value)}
              className={input}
              {...errorProps("field-guests", errors.guests)}
            />
            <FieldError id="field-guests" message={errors.guests} />
          </div>

          <div className="lg:col-span-2">
            <Label as="p">Add-ons</Label>
            <AddonPicker
              loading={addonList.loading && Boolean(yachtId)}
              error={addonList.error ? bookingErrorMessage(addonList.error) : ""}
              options={yachtId ? (addonList.data ?? []) : []}
              noYacht={!yachtId}
              value={addons}
              onChange={setAddons}
            />
          </div>

          <div className="lg:col-span-2 lg:max-w-[281px]">
            <Label htmlFor="field-note">Internal booking note</Label>
            <input
              id="field-note"
              value={note}
              maxLength={2000}
              onChange={(e) => setNote(e.currentTarget.value)}
              placeholder="e.g. Office-arranged charter."
              className={input}
            />
          </div>
        </div>

        <InfoPanel title="Before you create" className="mt-[30px] lg:mt-[40px] lg:max-w-[880px]">
          Recheck availability and review the final price. Choose whether to record an offline
          payment or send a secure payment link.
        </InfoPanel>

        {failure && (
          <Notice tone="error" className="mt-[20px] lg:max-w-[880px]">
            {failure}
          </Notice>
        )}

        <div className="mt-[24px] flex flex-wrap gap-[14px] lg:mt-[30px]">
          <button
            type="submit"
            disabled={reviewing}
            className={cx(smallPrimary, "min-w-[168px]")}
            style={PRIMARY_STYLE}
          >
            {reviewing ? "Checking price…" : "Review & choose payment"}
            {!reviewing && <ArrowRight aria-hidden="true" className="size-[12px]" />}
          </button>
          <Link
            href={adminRoutes.bookings}
            className={cx(smallOutline, "min-w-[90px]")}
            style={{ borderColor: INK }}
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
  maxLength,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  maxLength?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <Label htmlFor={id} required>
        {label}
      </Label>
      <input
        id={id}
        type={type}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.currentTarget.value)}
        className={input}
        {...errorProps(id, error)}
      />
      <FieldError id={id} message={error} />
    </div>
  );
}

function AddonPicker({
  loading,
  error,
  options,
  noYacht,
  value,
  onChange,
}: {
  loading: boolean;
  error: string;
  options: {
    id: string;
    name: string;
    price: number;
    min_quantity: number;
    max_quantity: number;
  }[];
  noYacht: boolean;
  value: Record<string, number>;
  onChange: (value: Record<string, number>) => void;
}) {
  const note = (text: string) => (
    <p className={`${input} flex items-center lg:max-w-[281px]`} style={{ color: MUTED }}>
      {text}
    </p>
  );
  if (noYacht) return note("Choose a yacht to see its add-ons");
  if (loading) return note("Loading add-ons…");
  if (error) return note(`Couldn't load add-ons. ${error}`);
  if (!options.length) return note("This yacht has no add-ons");

  const set = (id: string, qty: number) => onChange({ ...value, [id]: qty });
  return (
    <ul className="grid gap-[10px] lg:grid-cols-2">
      {options.map((a) => {
        const qty = value[a.id] ?? 0;
        const min = Math.max(1, a.min_quantity);
        return (
          <li
            key={a.id}
            className="flex min-h-[52px] items-center justify-between gap-[12px] border border-[#dcdad5] bg-white px-[14px] py-[8px]"
          >
            <span className="text-[13px] leading-[18px]">
              {a.name}
              <span className="block text-[11px]" style={{ color: BODY }}>
                {formatRupees(a.price)} each + GST
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-[6px]">
              <button
                type="button"
                aria-label={`Fewer ${a.name}`}
                disabled={qty === 0}
                onClick={() => set(a.id, qty <= min ? 0 : qty - 1)}
                className="flex size-[30px] items-center justify-center border border-[#dcdad5] disabled:opacity-40"
              >
                <Minus aria-hidden="true" className="size-[12px]" />
              </button>
              <span aria-live="polite" className="w-[24px] text-center text-[13px]">
                {qty}
              </span>
              <button
                type="button"
                aria-label={`More ${a.name}`}
                disabled={qty >= a.max_quantity}
                onClick={() => set(a.id, qty === 0 ? min : qty + 1)}
                className="flex size-[30px] items-center justify-center border border-[#dcdad5] disabled:opacity-40"
              >
                <Plus aria-hidden="true" className="size-[12px]" />
              </button>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** The reviewed price: charter, add-ons, GST and total. */
function QuoteSummary({ quote }: { quote: Quote }) {
  const rows: [string, string][] = [
    [
      `Charter · ${quote.slot.slot_type_name} · ${slotText(quote.slot)}`,
      formatRupees(quote.charter_amount),
    ],
    ...quote.addons.map((a): [string, string] => [
      `${a.name} × ${a.quantity}`,
      formatRupees(a.amount),
    ]),
    [`${quote.tax_label} (${quote.tax_rate}%)`, formatRupees(quote.tax_amount)],
  ];
  return (
    <div className="mt-[22px] border border-[#dcdad5] bg-white px-[18px] py-[16px] text-[12px] lg:max-w-[580px]">
      <p className="text-[10px] tracking-[0.12em] uppercase" style={{ color: MUTED }}>
        Price reviewed · {longDate(quote.slot.date)} · {quote.guests}{" "}
        {quote.guests === 1 ? "guest" : "guests"}
      </p>
      <dl className="mt-[10px]">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-[12px] py-[4px]">
            <dt style={{ color: BODY }}>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
        <div className="mt-[6px] flex justify-between gap-[12px] border-t border-[#eceae6] pt-[8px] text-[14px]">
          <dt>Total</dt>
          <dd>{formatRupees(quote.total_amount)}</dd>
        </div>
      </dl>
    </div>
  );
}
