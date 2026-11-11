"use client";

import { Check, Copy } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { BODY } from "@/components/admin/admin-theme";
import {
  errorProps,
  FieldError,
  input,
  Label,
  Notice,
  OUTLINE_STYLE,
  PRIMARY_STYLE,
  SelectBox,
} from "@/components/admin/form-parts";
import { adminRoutes } from "@/constants/routes";
import type { OfficePaymentMethod, PaymentLink } from "@/services/admin/bookings.service";

import {
  bookingErrorMessage,
  formatInstant,
  formatRupees,
  marinaToday,
  parseRupees,
  rupeesInput,
} from "../utils/booking-format";
import { formGrid, InfoPanel, SegmentTabs, smallOutline, smallPrimary } from "./booking-ui";

export type PaymentMode = "offline" | "link";

export interface OfflinePaymentInput {
  method: OfficePaymentMethod;
  amount: number;
  received_on: string;
  reference?: string;
  /** Staff-only note saved with the booking. */
  note?: string;
}

/** Thrown by `onSendLink` when the booking exists but the link failed. */
export class LinkFailure extends Error {
  constructor(
    readonly reason: unknown,
    readonly bookingId: string,
  ) {
    super("Payment link failed");
  }
}

const METHODS: { value: OfficePaymentMethod; label: string }[] = [
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cash", label: "Cash" },
];

/**
 * Offline payment / payment link (admin Figma A10 and A38). Used when creating
 * an office booking and for an unpaid office booking. The caller does the
 * saving; this collects the details and shows the outcome.
 */
export function PaymentChoice({
  total,
  customer,
  initialMode = "offline",
  onRecordOffline,
  onSendLink,
  backHref,
  backLabel = "Back to booking",
  onBack,
}: {
  /** Paise, tax included. */
  total: number;
  customer: { name: string; email: string };
  initialMode?: PaymentMode;
  onRecordOffline: (payment: OfflinePaymentInput) => Promise<void>;
  /** Resolves with the issued link and the booking it belongs to. */
  onSendLink: () => Promise<{ link: PaymentLink; bookingId: string }>;
  backHref?: Route;
  backLabel?: string;
  onBack?: () => void;
}) {
  const today = marinaToday();
  const [mode, setMode] = useState<PaymentMode>(initialMode);
  const [amount, setAmount] = useState(rupeesInput(total));
  const [method, setMethod] = useState<OfficePaymentMethod>("bank_transfer");
  const [receivedOn, setReceivedOn] = useState(today);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<{ text: string; bookingId?: string }>();
  const [issued, setIssued] = useState<{ link: PaymentLink; bookingId: string }>();
  const [copied, setCopied] = useState(false);

  async function record(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    const paise = parseRupees(amount);
    if (Number.isNaN(paise)) next.amount = "Enter the amount received, e.g. 131250.";
    else if (paise !== total)
      next.amount = `It must equal the booking total, ${formatRupees(total)}. Part payments aren't recorded.`;
    if (!receivedOn) next.receivedOn = "Choose the date the money arrived.";
    else if (receivedOn > today) next.receivedOn = "This date can't be in the future.";
    if (method === "bank_transfer" && !reference.trim())
      next.reference = "Enter the bank transfer reference.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    setFailure(undefined);
    try {
      await onRecordOffline({
        method,
        amount: paise,
        received_on: receivedOn,
        ...(reference.trim() ? { reference: reference.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
    } catch (error) {
      setFailure({ text: bookingErrorMessage(error) });
      setBusy(false);
    }
  }

  async function sendLink() {
    setBusy(true);
    setFailure(undefined);
    try {
      setIssued(await onSendLink());
    } catch (error) {
      if (error instanceof LinkFailure)
        setFailure({ text: bookingErrorMessage(error.reason), bookingId: error.bookingId });
      else setFailure({ text: bookingErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued.link.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* the link stays selectable */
    }
  }

  const back = backHref ? (
    <Link href={backHref} className={smallOutline} style={OUTLINE_STYLE}>
      {backLabel}
    </Link>
  ) : onBack ? (
    <button type="button" onClick={onBack} className={smallOutline} style={OUTLINE_STYLE}>
      {backLabel}
    </button>
  ) : null;

  const failureNotice = failure && (
    <Notice tone="error" className="mt-[20px] lg:max-w-[700px]">
      {failure.text}
      {failure.bookingId && (
        <>
          {" "}
          The booking was created and is waiting for payment.{" "}
          <Link href={adminRoutes.booking(failure.bookingId)} className="underline">
            Open the booking
          </Link>
        </>
      )}
    </Notice>
  );

  if (issued) {
    return (
      <div className="mt-[24px] lg:mt-[30px]">
        <Notice className="lg:max-w-[700px]">
          {issued.link.emailed
            ? `Payment link emailed to ${customer.email}.`
            : "The link was created, but the email couldn't be sent. Copy the link and send it another way."}{" "}
          It works until {formatInstant(issued.link.expires_at)}.
        </Notice>
        <div className="mt-[20px] lg:max-w-[700px]">
          <Label htmlFor="payment-link-url">
            Payment link — anyone with it can pay this booking
          </Label>
          <div className="flex gap-[10px]">
            <input
              id="payment-link-url"
              readOnly
              value={issued.link.url}
              onFocus={(e) => e.currentTarget.select()}
              className={input}
            />
            <button
              type="button"
              onClick={copyLink}
              className={`${smallOutline} h-[52px] shrink-0`}
              style={OUTLINE_STYLE}
            >
              {copied ? (
                <Check aria-hidden="true" className="size-[13px]" />
              ) : (
                <Copy aria-hidden="true" className="size-[13px]" />
              )}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
        <div className="mt-[24px] flex flex-wrap gap-[14px]">
          <Link
            href={adminRoutes.booking(issued.bookingId)}
            className={smallPrimary}
            style={PRIMARY_STYLE}
          >
            Open booking
          </Link>
          <Link href={adminRoutes.bookings} className={smallOutline} style={OUTLINE_STYLE}>
            All bookings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-[22px] lg:mt-[28px]">
      <SegmentTabs
        label="How the guest pays"
        value={mode}
        onChange={(m) => {
          setMode(m);
          setFailure(undefined);
        }}
        options={[
          { value: "offline", label: "Offline payment" },
          { value: "link", label: "Payment link" },
        ]}
      />

      {mode === "offline" ? (
        <form onSubmit={record} noValidate className="mt-[24px] lg:mt-[30px]">
          <div className={formGrid}>
            <div>
              <Label htmlFor="pay-amount" required>
                Amount received
              </Label>
              <div className="relative">
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-[16px] -translate-y-1/2 text-[14px]"
                >
                  ₹
                </span>
                <input
                  id="pay-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.currentTarget.value)}
                  className={`${input} pl-[32px]`}
                  {...errorProps("pay-amount", errors.amount)}
                />
              </div>
              <FieldError id="pay-amount" message={errors.amount} />
            </div>
            <div>
              <Label htmlFor="pay-method" required>
                Payment method
              </Label>
              <SelectBox
                id="pay-method"
                value={method}
                onChange={(v) => setMethod(v as OfficePaymentMethod)}
                options={METHODS}
              />
            </div>
            <div>
              <Label htmlFor="pay-received" required>
                Received on
              </Label>
              <input
                id="pay-received"
                type="date"
                value={receivedOn}
                max={today}
                onChange={(e) => setReceivedOn(e.currentTarget.value)}
                className={input}
                {...errorProps("pay-received", errors.receivedOn)}
              />
              <FieldError id="pay-received" message={errors.receivedOn} />
            </div>
            <div>
              <Label htmlFor="pay-reference" required={method === "bank_transfer"}>
                Payment reference
              </Label>
              <input
                id="pay-reference"
                value={reference}
                maxLength={100}
                onChange={(e) => setReference(e.currentTarget.value)}
                placeholder={method === "cash" ? "Receipt number" : "e.g. BANK-REF-1048"}
                className={input}
                {...errorProps("pay-reference", errors.reference)}
              />
              <FieldError id="pay-reference" message={errors.reference} />
            </div>
            <div>
              <Label htmlFor="pay-note">Internal note</Label>
              <input
                id="pay-note"
                value={note}
                maxLength={2000}
                onChange={(e) => setNote(e.currentTarget.value)}
                placeholder="e.g. Verify against the received bank payment."
                className={input}
              />
            </div>
          </div>

          <InfoPanel title="Record payment" className="mt-[28px] lg:mt-[36px] lg:max-w-[700px]">
            Recording an offline payment records money already received. A payment link remains
            unpaid until the payment is verified.
          </InfoPanel>
          {failureNotice}

          <div className="mt-[24px] flex flex-wrap gap-[14px] lg:mt-[30px]">
            <button type="submit" disabled={busy} className={smallPrimary} style={PRIMARY_STYLE}>
              {busy ? "Recording…" : "Record payment & confirm booking"}
            </button>
            <button
              type="button"
              onClick={() => setMode("link")}
              disabled={busy}
              className={smallOutline}
              style={OUTLINE_STYLE}
            >
              Send secure payment link
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-[24px] lg:mt-[30px]">
          <div className={formGrid}>
            {[
              ["Customer", `${customer.name} · ${customer.email}`],
              ["Amount due", formatRupees(total)],
              ["Link expiry", "24 hours after sending; the slot is held until then"],
              ["Delivery", "Email"],
            ].map(([label, value]) => (
              <div key={label}>
                <Label as="p">{label}</Label>
                <p className={`${input} flex items-center truncate`} style={{ color: BODY }}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          <InfoPanel
            title="Payment remains pending"
            className="mt-[28px] lg:mt-[36px] lg:max-w-[700px]"
          >
            Sending a link does not record payment. Confirmation follows verified payment and
            availability.
          </InfoPanel>
          {failureNotice}

          <div className="mt-[24px] flex flex-wrap gap-[14px] lg:mt-[30px]">
            <button
              type="button"
              onClick={sendLink}
              disabled={busy}
              className={smallPrimary}
              style={PRIMARY_STYLE}
            >
              {busy ? "Sending…" : "Confirm send payment link"}
            </button>
            {back}
          </div>
        </div>
      )}
    </div>
  );
}
