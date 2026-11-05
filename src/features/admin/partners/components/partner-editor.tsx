"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { BODY, INK, MUTED } from "@/components/admin/admin-theme";
import {
  FieldError,
  Label,
  LoadState,
  Notice,
  OUTLINE_STYLE,
  PRIMARY_STYLE,
  errorProps,
  input,
  outlineButton,
  primaryButton,
} from "@/components/admin/form-parts";
import { adminRoutes } from "@/constants/routes";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { fleetErrorMessage } from "@/features/admin/fleet/utils/fleet-error-message";
import {
  createPartner,
  getPartner,
  setPartnerCommission,
  updatePartner,
  type Partner,
  type PartnerDetail,
  type PartnerDocument,
} from "@/services/admin/partners.service";

import {
  EMPTY_PARTNER_FORM,
  commissionChange,
  partnerChanges,
  partnerFormErrors,
  partnerFormFromPartner,
  partnerInput,
  type PartnerFormValues,
} from "../utils/partner-form";
import { AgreementPanel } from "./agreement-panel";
import { PartnerYachts } from "./partner-yachts";

const NOT_FOUND = "This partner";

function Heading({ subtitle }: { subtitle: string }) {
  return (
    <>
      <p className="text-[10px] tracking-[0.12em] uppercase" style={{ color: MUTED }}>
        Sithara Marina / Admin
      </p>
      <h1 className="mt-[18px] text-[30px] leading-[1.15] font-normal tracking-[-0.8px] lg:mt-[28px] lg:text-[43px] lg:tracking-[-1.3px]">
        A considered partnership.
      </h1>
      <p className="mt-[16px] text-[12px] leading-[19px] lg:mt-[20px]" style={{ color: BODY }}>
        {subtitle}
      </p>
    </>
  );
}

const PAGE = "px-[20px] pt-[20px] pb-[48px] lg:pt-[33px] lg:pr-[47px] lg:pb-[60px] lg:pl-[46px]";

/** Partner details from the admin Figma design; also the Add partner form. */
export function PartnerEditor({ partnerId, created }: { partnerId?: string; created?: boolean }) {
  if (!partnerId) return <PartnerForm />;
  return <SavedPartner partnerId={partnerId} created={created} />;
}

/** GET /admin/partners/{id} */
function SavedPartner({ partnerId, created }: { partnerId: string; created?: boolean }) {
  const query = useAdminQuery((signal) => getPartner(partnerId, signal), partnerId);
  const partner = query.data;

  if (!partner) {
    return (
      <div className={PAGE}>
        <Heading subtitle="Partner details" />
        <LoadState
          loading={query.loading}
          label="Loading partner"
          error={
            query.error
              ? `Couldn't load this partner. ${fleetErrorMessage(query.error, NOT_FOUND)}`
              : ""
          }
          onRetry={query.reload}
        />
      </div>
    );
  }

  return (
    <PartnerForm
      key={partner.id}
      partner={partner}
      created={created}
      onSaved={(saved) => query.setData((current) => ({ ...current!, ...saved }))}
      onDocumentAdded={(document) =>
        query.setData((current) => ({
          ...current!,
          documents: [...current!.documents, document],
        }))
      }
    />
  );
}

function PartnerForm({
  partner,
  created,
  onSaved,
  onDocumentAdded,
}: {
  partner?: PartnerDetail;
  created?: boolean;
  onSaved?: (partner: Partner) => void;
  onDocumentAdded?: (document: PartnerDocument) => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<PartnerFormValues>(() =>
    partner ? partnerFormFromPartner(partner) : EMPTY_PARTNER_FORM,
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState("");
  const [notice, setNotice] = useState(created ? "Partner added." : "");
  const busy = useRef(false);

  // Keeps the "added" message from coming back on a reload.
  useEffect(() => {
    if (created) window.history.replaceState(null, "", window.location.pathname);
  }, [created]);

  const set = (key: keyof PartnerFormValues, id: string) => ({
    id,
    value: form[key],
    onChange: (e: { currentTarget: { value: string } }) => {
      const { value } = e.currentTarget;
      setForm((f) => ({ ...f, [key]: value }));
      setErrors((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      setNotice("");
    },
    className: input,
    ...errorProps(id, errors[id]),
  });

  async function run(action: () => Promise<void>, failure: string) {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setProblem("");
    setNotice("");
    try {
      await action();
    } catch (err) {
      setProblem(`${failure} ${fleetErrorMessage(err, NOT_FOUND)}`);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  function save(event: FormEvent) {
    event.preventDefault();
    const found = partnerFormErrors(form);
    setErrors(found);
    const firstError = Object.keys(found)[0];
    if (firstError) {
      document.getElementById(firstError)?.focus();
      return;
    }

    void run(async () => {
      if (!partner) {
        const added = await createPartner(partnerInput(form));
        router.replace(`${adminRoutes.partner(added.id)}?notice=created` as Route);
        return;
      }
      const changes = partnerChanges(form, partner);
      const commission = commissionChange(form, partner);
      if (Object.keys(changes).length) onSaved?.(await updatePartner(partner.id, changes));
      if (commission !== undefined) {
        onSaved?.(await setPartnerCommission(partner.id, commission));
      }
      setNotice("Changes saved.");
    }, `Couldn't save the partner.`);
  }

  function toggleActive() {
    if (!partner) return;
    const { id, name, is_active: active } = partner;
    const question = active
      ? `Deactivate ${name}? It can't be chosen for new yachts. Its yachts and bookings stay as they are.`
      : `Activate ${name}?`;
    if (!window.confirm(question)) return;
    void run(
      async () => {
        onSaved?.(await updatePartner(id, { is_active: !active }));
        setNotice(`${name} is ${active ? "deactivated" : "active"}.`);
      },
      `Couldn't ${active ? "deactivate" : "activate"} the partner.`,
    );
  }

  const subtitle = partner
    ? `${partner.name} · Partner details${partner.is_active ? "" : " · Inactive"}`
    : "New partner";

  return (
    <form onSubmit={save} noValidate className={PAGE}>
      <Heading subtitle={subtitle} />

      <div className="mt-[28px] grid gap-x-[21px] gap-y-[24px] sm:grid-cols-2">
        <div>
          <Label htmlFor="partner-name" required>
            Partner name
          </Label>
          <input {...set("name", "partner-name")} maxLength={200} autoComplete="off" />
          <FieldError id="partner-name" message={errors["partner-name"]} />
        </div>
        <div>
          <Label htmlFor="partner-contact" required>
            Contact person
          </Label>
          <input {...set("contact", "partner-contact")} maxLength={200} autoComplete="off" />
          <FieldError id="partner-contact" message={errors["partner-contact"]} />
        </div>
        <div>
          <Label htmlFor="partner-email" required>
            Email
          </Label>
          <input
            {...set("email", "partner-email")}
            type="email"
            maxLength={255}
            autoComplete="off"
          />
          <FieldError id="partner-email" message={errors["partner-email"]} />
        </div>
        <div>
          <Label htmlFor="partner-phone">Phone</Label>
          <input {...set("phone", "partner-phone")} type="tel" maxLength={30} autoComplete="off" />
          <FieldError id="partner-phone" message={errors["partner-phone"]} />
        </div>
        <div>
          <Label htmlFor="partner-effective">Agreement effective from</Label>
          <input
            {...set("agreementFrom", "partner-effective")}
            type="date"
            max={form.agreementTill || undefined}
          />
        </div>
        <div>
          <Label htmlFor="partner-valid">Agreement valid until</Label>
          <input
            {...set("agreementTill", "partner-valid")}
            type="date"
            min={form.agreementFrom || undefined}
          />
          <FieldError id="partner-valid" message={errors["partner-valid"]} />
        </div>
        <div>
          <Label htmlFor="partner-commission" hint="for new bookings on yachts with no rate">
            Default commission (%)
          </Label>
          <input {...set("commission", "partner-commission")} inputMode="decimal" />
          <FieldError id="partner-commission" message={errors["partner-commission"]} />
        </div>
      </div>

      <div className="mt-[28px] flex flex-col gap-[24px]">
        {partner ? (
          <AgreementPanel
            partnerId={partner.id}
            documents={partner.documents}
            onAdded={(document) => onDocumentAdded?.(document)}
          />
        ) : (
          <section className="border border-[#e3e1dc] bg-white px-[16px] pt-[20px] pb-[20px]">
            <h2 className="text-[18px] leading-[24px]">Agreement document</h2>
            <p className="mt-[10px] text-[12px] leading-[18px]" style={{ color: BODY }}>
              You can upload the agreement once the partner is saved.
            </p>
          </section>
        )}
        {partner && (
          <PartnerYachts partnerId={partner.id} defaultRate={partner.default_commission_rate} />
        )}
      </div>

      {problem && (
        <Notice tone="error" className="mt-[20px]">
          {problem}
        </Notice>
      )}
      {notice && <Notice className="mt-[20px]">{notice}</Notice>}

      <div className="mt-[22px] flex flex-col items-start gap-[14px] sm:flex-row">
        <button
          type="submit"
          disabled={saving}
          className={`${primaryButton} w-[148px]`}
          style={PRIMARY_STYLE}
        >
          {saving ? "Saving…" : "Save partner"}
        </button>
        {partner && (
          <Link
            href={adminRoutes.payouts}
            className={`${outlineButton} w-[172px]`}
            style={OUTLINE_STYLE}
          >
            View payout statement
          </Link>
        )}
      </div>

      {partner && (
        <button
          type="button"
          onClick={toggleActive}
          disabled={saving}
          className="mt-[18px] text-[12px] hover:underline disabled:opacity-50"
          style={{ color: INK }}
        >
          {partner.is_active ? "Deactivate partner" : "Activate partner"}
        </button>
      )}
    </form>
  );
}
