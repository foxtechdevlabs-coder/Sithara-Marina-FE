"use client";

import { useRef, useState, type FormEvent } from "react";

import { useApiQuery } from "@/hooks/use-api-query";
import { formatMinorUnits } from "@/features/user/yachts/utils/yacht-view";
import { updateCheckoutSession, type CheckoutSession } from "@/services/user/checkout.service";
import { getYachtAddons } from "@/services/user/yachts.service";

import { checkoutErrorMessage } from "../utils/checkout-error-message";
import {
  contactSchema,
  FULL_NAME_MAX_LENGTH,
  SPECIAL_REQUESTS_MAX_LENGTH,
} from "../utils/contact-schema";
import {
  fieldErrorClass,
  inputClass,
  labelClass,
  Loading,
  Notice,
  primaryButtonClass,
  primaryButtonStyle,
  QuantityStepper,
  secondaryButtonClass,
  textLinkClass,
} from "./checkout-ui";

interface SessionEditorProps {
  session: CheckoutSession;
  checkoutToken: string | null;
  onSaved: (session: CheckoutSession) => void;
  onCancel: () => void;
}

/** Changes what PATCH /checkout/sessions/{id} allows: guests, add-ons and contact details. */
export function SessionEditor({ session, checkoutToken, onSaved, onCancel }: SessionEditorProps) {
  const [guests, setGuests] = useState(session.guests);
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(session.addons.map((addon) => [addon.addon_id, addon.quantity])),
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inFlight = useRef(false);
  const slug = session.yacht.slug;
  const addons = useApiQuery((signal) => getYachtAddons(slug, signal), slug);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;

    const data = new FormData(event.currentTarget);
    const contact = contactSchema.safeParse({
      full_name: String(data.get("full_name") ?? ""),
      phone: String(data.get("phone") ?? ""),
      special_requests: String(data.get("special_requests") ?? ""),
    });
    if (!contact.success) {
      setError(contact.error.issues[0]?.message ?? "Please check your details.");
      return;
    }

    inFlight.current = true;
    setError(null);
    setSaving(true);
    try {
      onSaved(
        await updateCheckoutSession(
          session.id,
          {
            guests,
            addons: Object.entries(quantities)
              .filter(([, quantity]) => quantity > 0)
              .map(([addon_id, quantity]) => ({ addon_id, quantity })),
            contact: {
              ...contact.data,
              special_requests: contact.data.special_requests || null,
            },
          },
          checkoutToken,
        ),
      );
    } catch (failure) {
      setError(checkoutErrorMessage(failure, "We couldn’t save your changes. Please try again."));
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="grid max-w-[640px] gap-[28px]">
      <div className="flex flex-wrap items-center justify-between gap-[16px]">
        <span className={labelClass}>Guests</span>
        <QuantityStepper label="guests" value={guests} min={1} onChange={setGuests} />
      </div>

      {addons.loading ? (
        <Loading label="Loading add-ons" />
      ) : addons.error ? (
        <Notice alert>
          {checkoutErrorMessage(addons.error, "We couldn’t load the add-ons just now.")}{" "}
          <button type="button" className={textLinkClass} onClick={addons.reload}>
            Try again
          </button>
        </Notice>
      ) : (
        addons.data?.items.map((addon) => (
          <div key={addon.id} className="flex flex-wrap items-center justify-between gap-[16px]">
            <div className="min-w-0">
              <p className="text-[16px] leading-[24px]">{addon.name}</p>
              <p className="text-[14px] leading-[20px] text-[#7a7f85]">
                {formatMinorUnits(addon.price, addons.data?.currency ?? "INR")} · excl. GST
              </p>
            </div>
            <QuantityStepper
              label={addon.name}
              value={quantities[addon.id] ?? 0}
              min={addon.min_quantity}
              max={addon.max_quantity}
              optional
              onChange={(quantity) =>
                setQuantities((current) => ({ ...current, [addon.id]: quantity }))
              }
            />
          </div>
        ))
      )}

      <div>
        <label htmlFor="edit-full_name" className={labelClass}>
          Full name
        </label>
        <input
          id="edit-full_name"
          name="full_name"
          autoComplete="name"
          maxLength={FULL_NAME_MAX_LENGTH}
          defaultValue={session.contact.full_name}
          className={`${inputClass} mt-[12px]`}
        />
      </div>
      <div>
        <label htmlFor="edit-phone" className={labelClass}>
          Phone, with country code
        </label>
        <input
          id="edit-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          defaultValue={session.contact.phone}
          className={`${inputClass} mt-[12px]`}
        />
      </div>
      <div>
        <label htmlFor="edit-special_requests" className={labelClass}>
          Special requests (optional)
        </label>
        <textarea
          id="edit-special_requests"
          name="special_requests"
          rows={3}
          maxLength={SPECIAL_REQUESTS_MAX_LENGTH}
          defaultValue={session.contact.special_requests ?? undefined}
          className={`${inputClass} mt-[12px] h-auto py-[14px]`}
        />
      </div>

      {error && <p role="alert" className={fieldErrorClass}>{error}</p>}

      <div className="flex flex-wrap gap-[16px]">
        <button
          type="submit"
          disabled={saving}
          className={primaryButtonClass}
          style={primaryButtonStyle}
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        <button type="button" disabled={saving} onClick={onCancel} className={secondaryButtonClass}>
          Keep as it was
        </button>
      </div>
    </form>
  );
}
