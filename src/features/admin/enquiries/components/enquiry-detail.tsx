"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { BODY } from "@/components/admin/admin-theme";
import {
  errorProps,
  FieldError,
  input,
  Label,
  LoadState,
  Notice,
  OUTLINE_STYLE,
  PRIMARY_STYLE,
  SelectBox,
} from "@/components/admin/form-parts";
import { searchYachts } from "@/components/admin/lookups";
import { SearchSelect } from "@/components/admin/search-select";
import { adminRoutes } from "@/constants/routes";
import { useAdminSession } from "@/features/admin/auth/components/admin-session-provider";
import {
  Card,
  DetailList,
  formGrid,
  PageHeader,
  pagePadding,
  SegmentTabs,
  smallOutline,
  smallPrimary,
} from "@/features/admin/bookings/components/booking-ui";
import {
  formatInstant,
  formatRupees,
  marinaToday,
  parseRupees,
} from "@/features/admin/bookings/utils/booking-format";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { cx } from "@/lib/cx";
import {
  createProposal,
  getEnquiry,
  reviseProposal,
  updateEnquiry,
  updateProposal,
  type EnquiryDetail as Detail,
} from "@/services/admin/enquiries.service";
import { getSlotTypes } from "@/services/admin/fleet.service";
import { listStaff } from "@/services/admin/staff.service";
import { isApiError } from "@/services/http/api-error";

import {
  dayText,
  durationText,
  enquiryErrorMessage,
  enquiryFacts,
  enquiryWishes,
  historyText,
  MANUAL_STAGES,
  proposalActions,
  proposalLengthText,
  proposalStatusLabel,
  stageLabel,
} from "../utils/enquiry-format";
import {
  customMinutes,
  MESSAGE_MAX,
  proposalDraft,
  proposalErrors,
  proposalInput,
  proposalPatch,
  returnTime,
  TERMS_MAX,
  type ProposalCheckContext,
  type ProposalDraft,
} from "../utils/proposal-form";

type Tab = "enquiry" | "proposal" | "history";

const textarea = cx(input, "h-auto min-h-[88px] py-[12px] leading-[20px]");

/** Enquiry: "A journey in the making." (admin Figma A29). */
export function EnquiryDetail({
  enquiryId,
  initialTab = "enquiry",
  notice,
}: {
  enquiryId: string;
  initialTab?: Tab;
  notice?: string;
}) {
  const enquiry = useAdminQuery((signal) => getEnquiry(enquiryId, signal), `enquiry:${enquiryId}`);
  const [tab, setTab] = useState<Tab>(initialTab);

  if (!enquiry.data) {
    return (
      <div className={pagePadding}>
        <PageHeader title="A journey in the making." />
        <div className="mt-[24px]">
          <LoadState
            loading={enquiry.loading}
            error={
              enquiry.error
                ? `Couldn't load the enquiry. ${enquiryErrorMessage(enquiry.error)}`
                : undefined
            }
            onRetry={enquiry.reload}
            label="Loading enquiry"
          />
        </div>
      </div>
    );
  }
  const e = enquiry.data;

  return (
    <div className={pagePadding}>
      <PageHeader
        title="A journey in the making."
        subtitle={`Enquiry ${e.reference} · ${e.contact.full_name}`}
      />
      {notice === "sent" && (
        <Notice className="mt-[18px] lg:max-w-[880px]">Proposal sent to {e.contact.email}.</Notice>
      )}

      <div className="mt-[20px] lg:mt-[26px]">
        <SegmentTabs
          label="Enquiry sections"
          value={tab}
          onChange={setTab}
          options={[
            { value: "enquiry", label: "Enquiry" },
            {
              value: "proposal",
              label: `Proposal${e.proposals.length ? ` (${e.proposals.length})` : ""}`,
            },
            { value: "history", label: "History" },
          ]}
        />
      </div>

      {tab === "enquiry" && (
        <EnquiryTab enquiry={e} onChanged={enquiry.reload} onSaved={(d) => enquiry.setData(d)} />
      )}
      {tab === "proposal" && <ProposalsTab enquiry={e} openForm={() => setTab("enquiry")} />}
      {tab === "history" && <HistoryTab enquiry={e} />}
    </div>
  );
}

function EnquiryTab({
  enquiry: e,
  onChanged,
  onSaved,
}: {
  enquiry: Detail;
  onChanged: () => void;
  onSaved: (d: Detail) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ tone: "success" | "error"; text: string }>();
  const facts = enquiryFacts(e);

  async function patch(change: Parameters<typeof updateEnquiry>[1], done: string) {
    setBusy(true);
    setNote(undefined);
    try {
      const saved = await updateEnquiry(e.id, change);
      onSaved({ ...e, ...saved });
      setNote({ tone: "success", text: done });
    } catch (err) {
      setNote({ tone: "error", text: enquiryErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  const manual = (MANUAL_STAGES as readonly string[]).includes(e.status);

  return (
    <>
      <div className="mt-[24px] grid gap-[18px] lg:max-w-[1000px] lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card title="Customer’s request">
          <div className="mt-[6px] flex flex-wrap gap-x-[32px] gap-y-[10px]">
            <div>
              <p className="text-[11px]">Expected amount</p>
              <p className="text-[22px] leading-[30px]" style={{ color: "#0d1b2a" }}>
                {facts.request.find(([t]) => t === "Expected amount")?.[1] ?? "Not given"}
              </p>
            </div>
            <div>
              <p className="text-[11px]">Budget / proposed amount</p>
              <p className="text-[22px] leading-[30px]" style={{ color: "#0d1b2a" }}>
                {facts.budget ?? "Not given"}
              </p>
            </div>
            <div>
              <p className="text-[11px]">Requested duration</p>
              <p className="text-[22px] leading-[30px]" style={{ color: "#0d1b2a" }}>
                {facts.request.find(([t]) => t === "Requested duration")?.[1] ?? "Not given"}
              </p>
            </div>
            <div>
              <p className="text-[11px]">Number of days</p>
              <p className="text-[22px] leading-[30px]" style={{ color: "#0d1b2a" }}>
                {facts.request.find(([t]) => t === "Number of days")?.[1] ?? "Not given"}
              </p>
            </div>
          </div>
          <DetailList
            className="mt-[16px] whitespace-pre-line text-[#0d1b2a]"
            items={facts.request.filter(
              ([term]) =>
                ![
                  "Budget / proposed amount",
                  "Expected amount",
                  "Requested duration",
                  "Number of days",
                ].includes(term),
            )}
          />
        </Card>
        <div className="grid content-start gap-[18px]">
          <Card title="Contact details">
            <DetailList className="mt-[10px] text-[#0d1b2a]" items={facts.contact} />
          </Card>
          <Card title="Enquiry">
            <DetailList
              className="mt-[10px] text-[#0d1b2a]"
              items={[
                ["Reference", e.reference],
                ["Received", formatInstant(e.created_at)],
                ["Last updated", formatInstant(e.updated_at)],
                ["Stage", stageLabel(e.status)],
                ["Assigned concierge", e.assigned_to?.full_name ?? "Unassigned"],
              ]}
            />
          </Card>
        </div>
      </div>

      <div className={cx(formGrid, "mt-[24px] lg:max-w-[700px]")}>
        <div>
          <Label htmlFor="enquiry-assignee">Assigned concierge</Label>
          <SearchSelect
            id="enquiry-assignee"
            value={e.assigned_to?.id ?? ""}
            selectedLabel={e.assigned_to?.full_name}
            disabled={busy}
            onChange={(v, option) =>
              void patch(
                { assigned_to_id: v || null },
                v ? `Assigned to ${option?.label ?? "the concierge"}.` : "Unassigned.",
              )
            }
            load={async (search, signal) => {
              const staff = await listStaff(
                { limit: 20, ...(search ? { search: search.slice(0, 100) } : {}) },
                signal,
              );
              return {
                options: staff.items
                  .filter((s) => s.is_active)
                  .map((s) => ({ value: s.id, label: s.full_name, description: s.email })),
                hasMore: staff.total > staff.items.length,
              };
            }}
            clearable
            emptyLabel="Unassigned"
            placeholder="Search staff by name or email"
            noResults="No active staff member matches."
          />
        </div>
        <div>
          <Label htmlFor="enquiry-stage">Stage</Label>
          <SelectBox
            id="enquiry-stage"
            value={e.status}
            disabled={busy}
            onChange={(v) =>
              void patch(
                { status: v as (typeof MANUAL_STAGES)[number] },
                `Stage set to ${stageLabel(v)}.`,
              )
            }
            options={[
              ...(manual
                ? []
                : [{ value: e.status, label: `${stageLabel(e.status)} (from the proposal)` }]),
              ...MANUAL_STAGES.map((s) => ({ value: s, label: stageLabel(s) })),
            ]}
          />
        </div>
      </div>
      {note && (
        <Notice tone={note.tone} className="mt-[14px] lg:max-w-[700px]">
          {note.text}
        </Notice>
      )}

      <ProposalForm enquiry={e} onChanged={onChanged} />
    </>
  );
}

/** The checks again when saving, with the validity date compared to the clock now. */
const errorsAtSave = (draft: ProposalDraft, checks: ProposalCheckContext) =>
  proposalErrors(draft, { ...checks, now: Date.now() });

/** The proposal being worked on: a new one, or the latest draft (POST …/proposals, PATCH /admin/proposals/{id}). */
function ProposalForm({ enquiry: e, onChanged }: { enquiry: Detail; onChanged: () => void }) {
  const router = useRouter();
  const { admin } = useAdminSession();
  // A custom length and price (every new proposal) is created or edited by a super admin only.
  const canCustom = admin?.role === "super_admin";
  const latest = e.proposals[0];
  const draftProposal = latest?.status === "draft" ? latest : undefined;
  const closed = e.status === "closed";
  const isCustomVersion = (p: { duration_minutes: number | null } | undefined) =>
    Boolean(p && p.duration_minutes !== null);
  const [draft, setDraft] = useState<ProposalDraft>(() => proposalDraft(e, draftProposal));
  const isPackage = draft.length === "package";
  // Other staff see a custom proposal read-only (they can still review and send a draft);
  // a package proposal from before stays editable for them, as it has no hand-set price.
  const customLocked = !canCustom && !isPackage;
  /**
   * The draft this form saves to. Set as soon as a new draft is created, so a
   * second save before the enquiry reloads updates it instead of creating another.
   */
  const [draftId, setDraftId] = useState<string | null>(draftProposal?.id ?? null);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState<"" | "save" | "preview" | "revise">("");
  const [note, setNote] = useState<{ tone: "success" | "error"; text: string }>();
  const set = <K extends keyof ProposalDraft>(k: K, v: ProposalDraft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));
  // When the form opened: checks the validity date during render without reading the clock.
  const [now] = useState(() => Date.now());

  const slots = useAdminQuery(
    (signal) => (draft.yachtId ? getSlotTypes(draft.yachtId, signal) : Promise.resolve(null)),
    `proposal-slots:${draft.yachtId}`,
  );
  const checks = {
    today: marinaToday(),
    now,
    // A package draft keeps its saved package; nothing new is chosen.
    packageFound: isPackage && Boolean(draft.slotTypeId),
    packagesLoading: slots.loading,
    packageCount: isPackage ? 1 : 0,
    canCustom,
    hours: slots.data ? { opens: slots.data.opens_at, closes: slots.data.closes_at } : undefined,
  };
  const problems = proposalErrors(draft, checks);
  const errors = submitted ? problems : {};
  const returns = returnTime(draft.startTime, customMinutes(draft));

  // The saved version this form edits (for a package draft's name and last price).
  const saved = e.proposals.find((x) => x.id === draftId);
  const wishes = enquiryWishes(e.context);
  // A custom price is typed (the whole charter before GST, no hourly calculation);
  // a package draft is re-priced by the backend from the yacht's rates when saved.
  const charter = parseRupees(draft.charter);
  const totalText = isPackage
    ? saved && saved.pricing.total_amount !== null
      ? `${formatRupees(saved.pricing.total_amount)} incl. GST, as last saved`
      : "Priced from the yacht’s package rates when saved"
    : Number.isFinite(charter) && charter > 0
      ? `${formatRupees(charter)} + GST`
      : "Enter the charter price";

  async function save(then: "stay" | "preview") {
    if (busy) return;
    setSubmitted(true);
    setNote(undefined);
    if (Object.keys(errorsAtSave(draft, checks)).length) return;
    setBusy(then === "stay" ? "save" : "preview");
    try {
      const saved = draftId
        ? await updateProposal(draftId, proposalPatch(draft))
        : await createProposal(e.id, proposalInput(draft));
      setDraftId(saved.id);
      if (then === "preview") {
        router.push(adminRoutes.enquiryProposal(e.id, saved.id));
        return;
      }
      setNote({
        tone: "success",
        text: `Draft v${saved.version} saved. Total ${saved.pricing.total_amount === null ? "shown once the GST rate is set" : `${formatRupees(saved.pricing.total_amount)} incl. GST`}.`,
      });
      onChanged();
    } catch (err) {
      setNote({ tone: "error", text: enquiryErrorMessage(err, true) });
      // A version sent meanwhile (PROPOSAL_NOT_DRAFT) or a closed enquiry: show the current state.
      if (isApiError(err) && err.status === 409) onChanged();
    }
    setBusy("");
  }

  async function revise() {
    if (!latest || busy) return;
    setBusy("revise");
    setNote(undefined);
    try {
      const next = await reviseProposal(latest.id);
      setDraft(proposalDraft(e, next));
      setDraftId(next.id);
      setSubmitted(false);
      setNote({
        tone: "success",
        text: `Version ${next.version} drafted from version ${latest.version}. Change it, then send.`,
      });
      onChanged();
    } catch (err) {
      setNote({ tone: "error", text: enquiryErrorMessage(err) });
      if (isApiError(err) && err.status === 409) onChanged();
    }
    setBusy("");
  }

  if (latest && latest.status !== "draft") {
    const can = proposalActions(latest.status, closed);
    return (
      <section aria-labelledby="proposal-locked" className="mt-[30px] lg:max-w-[880px]">
        <h2 id="proposal-locked" className="text-[20px] leading-[26px]">
          Proposal v{latest.version} · {proposalStatusLabel(latest.status)}
        </h2>
        <p className="mt-[8px] text-[12px] leading-[18px]" style={{ color: BODY }}>
          {latest.yacht.name} · {dayText(latest.date)} · {latest.start_time}–{latest.end_time} ·{" "}
          {proposalLengthText(latest)} · {latest.guests} guests ·{" "}
          {latest.pricing.total_amount === null
            ? "total pending GST"
            : formatRupees(latest.pricing.total_amount)}
          {latest.sent_at ? ` · sent ${formatInstant(latest.sent_at)}` : ""}
          {latest.expires_at ? ` · valid until ${formatInstant(latest.expires_at)}` : ""}
        </p>
        {latest.decision_comment && (
          <p className="mt-[6px] text-[12px]">Customer’s comment: “{latest.decision_comment}”</p>
        )}
        {note && (
          <Notice tone={note.tone} className="mt-[14px]">
            {note.text}
          </Notice>
        )}
        {latest.status === "accepted" ? (
          <Notice className="mt-[14px]">
            The customer accepted this proposal and was sent to checkout. It can no longer change.
          </Notice>
        ) : can.revise && !canCustom && isCustomVersion(latest) ? (
          <Notice className="mt-[14px]">
            Only a super admin can revise this proposal, as its length and price are set by hand.
          </Notice>
        ) : can.revise ? (
          <div className="mt-[16px] flex flex-wrap items-center gap-[14px]">
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void revise()}
              className={cx(smallPrimary, "min-w-[170px]")}
              style={PRIMARY_STYLE}
            >
              {busy === "revise" ? "Drafting…" : `Revise into version ${latest.version + 1}`}
            </button>
            <p className="text-[11px]" style={{ color: BODY }}>
              A sent version can’t change. Revising copies it into a new draft; this one stays in
              the history and is replaced once the new version is sent.
            </p>
          </div>
        ) : closed ? (
          <Notice className="mt-[14px]">
            This enquiry is closed. Set the stage back to New or Needs details to revise the
            proposal.
          </Notice>
        ) : null}
      </section>
    );
  }

  return (
    <form
      noValidate
      onSubmit={(ev: FormEvent) => {
        ev.preventDefault();
        void save("stay");
      }}
      aria-labelledby="proposal-form"
      className="mt-[30px]"
    >
      <h2 id="proposal-form" className="text-[20px] leading-[26px]">
        {draftProposal ? `Proposal v${draftProposal.version} · draft` : "New proposal"}
      </h2>
      {/* What the customer asked for, for reference while proposing. A proposal is one
          date with a length back the same day, and the API has no days field, so the
          number of days is shown here, not entered. */}
      <div
        aria-label="Customer’s request"
        className="mt-[12px] flex flex-wrap gap-x-[28px] gap-y-[8px] border border-[#dcdad5] bg-[#fbfaf8] px-[16px] py-[12px] text-[13px] lg:max-w-[700px]"
      >
        <p>
          <span className="block text-[11px]" style={{ color: BODY }}>
            Customer asked for · number of days
          </span>
          {wishes.days !== null
            ? `${wishes.days} ${wishes.days === 1 ? "day" : "days"}`
            : "Not given"}
        </p>
        <p>
          <span className="block text-[11px]" style={{ color: BODY }}>
            Customer asked for · duration
          </span>
          {wishes.requestedMinutes !== null ? durationText(wishes.requestedMinutes) : "Not given"}
        </p>
        {wishes.days !== null && wishes.days > 1 && (
          <p className="w-full text-[11px]" style={{ color: BODY }}>
            A proposal covers one date. For a stay of several days, agree the plan with the customer
            (for example in the message below) or send one proposal per day.
          </p>
        )}
      </div>
      {closed && (
        <Notice tone="error" className="mt-[12px] lg:max-w-[700px]">
          This enquiry is closed. Set the stage back to New or Needs details to work on a proposal.
        </Notice>
      )}
      {customLocked && !closed && (
        <Notice className="mt-[12px] lg:max-w-[700px]">
          {draftProposal
            ? "Only a super admin can edit this proposal, as its length and price are set by hand. You can still review and send this draft."
            : "Only a super admin can create a proposal, as its length and price are set by hand."}
        </Notice>
      )}
      <fieldset disabled={closed || customLocked || Boolean(busy)} className="contents">
        <div className={cx(formGrid, "mt-[16px] lg:max-w-[700px]")}>
          <div>
            <Label htmlFor="proposal-yacht" required>
              Proposed yacht
            </Label>
            <SearchSelect
              id="proposal-yacht"
              value={draft.yachtId}
              selectedLabel={draft.yachtName || undefined}
              onChange={(v, option) =>
                setDraft((d) => ({
                  ...d,
                  yachtId: v,
                  yachtName: option?.data?.name ?? "",
                }))
              }
              load={searchYachts({ status: "active" })}
              invalid={errors.yacht}
              // A package belongs to its yacht: switch to a custom length to change the yacht.
              disabled={isPackage}
              placeholder="Search active yachts"
              noResults="No active yacht matches."
            />
            <FieldError id="proposal-yacht" message={errors.yacht} />
          </div>
          <div>
            <Label htmlFor="proposal-date" required>
              Departure
            </Label>
            <input
              id="proposal-date"
              type="date"
              min={marinaToday()}
              value={draft.date}
              onChange={(ev) => set("date", ev.currentTarget.value)}
              className={input}
              {...errorProps("proposal-date", errors.date)}
            />
            <FieldError id="proposal-date" message={errors.date} />
          </div>

          {isPackage ? (
            <div className="border border-[#dcdad5] bg-[#fbfaf8] px-[16px] py-[14px] lg:col-span-2">
              <p className="text-[11px]" style={{ color: BODY }}>
                Charter length
              </p>
              <p className="mt-[4px] text-[14px]">
                Package: {saved?.slot_type_name ?? "the yacht’s package"}
                {Number.isFinite(customMinutes(draft))
                  ? ` · ${durationText(customMinutes(draft))}`
                  : ""}
              </p>
              <p className="mt-[4px] text-[11px]" style={{ color: BODY }}>
                Kept from the original proposal and priced from the yacht’s package rates. It stays
                a package unless you switch it.
              </p>
              {canCustom && (
                <button
                  type="button"
                  onClick={() => set("length", "custom")}
                  className="mt-[8px] text-[12px] underline underline-offset-2"
                >
                  Use a custom length and price instead
                </button>
              )}
            </div>
          ) : (
            <>
              <div>
                <Label
                  htmlFor="proposal-hours"
                  required
                  hint={
                    slots.data?.opens_at && slots.data.closes_at
                      ? `at least 1 hour, within ${slots.data.opens_at}–${slots.data.closes_at}`
                      : "at least 1 hour"
                  }
                >
                  Length
                </Label>
                <div className="grid grid-cols-2 gap-[10px]">
                  <input
                    id="proposal-hours"
                    inputMode="numeric"
                    aria-label="Hours"
                    placeholder="Hours"
                    maxLength={2}
                    value={draft.hours}
                    onChange={(ev) => set("hours", ev.currentTarget.value.replace(/\D/g, ""))}
                    className={input}
                    {...errorProps("proposal-hours", errors.hours)}
                  />
                  <SelectBox
                    id="proposal-minutes"
                    value={draft.minutes}
                    onChange={(v) => set("minutes", v)}
                    options={[...new Set(["0", "15", "30", "45", draft.minutes])].map((m) => ({
                      value: m,
                      label: `${m} min`,
                    }))}
                  />
                </div>
                <FieldError id="proposal-hours" message={errors.hours} />
              </div>
              <div>
                <Label htmlFor="proposal-charter" required hint="₹, whole charter, before GST">
                  Charter price
                </Label>
                <input
                  id="proposal-charter"
                  inputMode="decimal"
                  placeholder="e.g. 125000"
                  value={draft.charter}
                  onChange={(ev) => set("charter", ev.currentTarget.value.replace(/[^\d.,]/g, ""))}
                  className={input}
                  {...errorProps("proposal-charter", errors.charter)}
                />
                <FieldError id="proposal-charter" message={errors.charter} />
              </div>
              {!draftId && (wishes.requestedMinutes !== null || wishes.expectedAmount !== null) && (
                <p className="text-[11px] lg:col-span-2" style={{ color: BODY }}>
                  Length and price are pre-filled from the customer’s request
                  {wishes.expectedAmount !== null
                    ? " (their expected amount: check whether it included GST)"
                    : ""}
                  . Change them as needed.
                </p>
              )}
            </>
          )}
          <div>
            <Label htmlFor="proposal-start" required hint="any time within charter hours">
              Start time
            </Label>
            <input
              id="proposal-start"
              type="time"
              value={draft.startTime}
              onChange={(ev) => set("startTime", ev.currentTarget.value)}
              className={input}
              {...errorProps("proposal-start", errors.start)}
            />
            {returns && !errors.start && (
              <p className="mt-[6px] text-[11px]" style={{ color: BODY }}>
                Returns at {returns}
              </p>
            )}
            <FieldError id="proposal-start" message={errors.start} />
          </div>
          <div>
            <Label htmlFor="proposal-guests" required>
              Guests
            </Label>
            <input
              id="proposal-guests"
              inputMode="numeric"
              maxLength={3}
              value={draft.guests}
              onChange={(ev) => set("guests", ev.currentTarget.value.replace(/\D/g, ""))}
              className={input}
              {...errorProps("proposal-guests", errors.guests)}
            />
            <FieldError id="proposal-guests" message={errors.guests} />
          </div>
          <div>
            <Label htmlFor="proposal-expires" hint="empty: 7 days after sending">
              Proposal validity
            </Label>
            <input
              id="proposal-expires"
              type="datetime-local"
              value={draft.expires}
              onChange={(ev) => set("expires", ev.currentTarget.value)}
              className={input}
              {...errorProps("proposal-expires", errors.expires)}
            />
            <FieldError id="proposal-expires" message={errors.expires} />
          </div>
          <div className="lg:col-span-2">
            <Label htmlFor="proposal-total">Total proposal amount</Label>
            <input
              id="proposal-total"
              readOnly
              value={totalText}
              className={cx(input, "bg-[#fbfaf8]")}
            />
            <p className="mt-[6px] text-[11px]" style={{ color: BODY }}>
              The whole charter as you typed it, before GST. GST is added by the server when the
              draft is saved; the saved total is shown on the Proposal tab.
            </p>
          </div>
        </div>

        <div className="mt-[20px] grid gap-y-[20px] lg:max-w-[700px]">
          <div>
            <Label htmlFor="proposal-inclusions" hint="one per line">
              Itinerary and inclusions
            </Label>
            <textarea
              id="proposal-inclusions"
              value={draft.inclusions}
              rows={3}
              placeholder={"Private coastal charter\nCrew\nSeasonal dining"}
              onChange={(ev) => set("inclusions", ev.currentTarget.value)}
              className={textarea}
            />
          </div>
          <div>
            <Label htmlFor="proposal-terms" hint={`${draft.terms.length}/${TERMS_MAX}`}>
              Exclusions and policy
            </Label>
            <textarea
              id="proposal-terms"
              value={draft.terms}
              rows={3}
              maxLength={TERMS_MAX}
              placeholder="Attach the agreed charter terms and relevant exclusions."
              onChange={(ev) => set("terms", ev.currentTarget.value)}
              className={textarea}
              {...errorProps("proposal-terms", errors.terms)}
            />
            <FieldError id="proposal-terms" message={errors.terms} />
          </div>
          <div>
            <Label
              htmlFor="proposal-message"
              hint={`shown to the customer · ${draft.message.length}/${MESSAGE_MAX}`}
            >
              Message to the customer
            </Label>
            <textarea
              id="proposal-message"
              value={draft.message}
              rows={3}
              maxLength={MESSAGE_MAX}
              placeholder="A personal note to go with the proposal."
              onChange={(ev) => set("message", ev.currentTarget.value)}
              className={textarea}
              {...errorProps("proposal-message", errors.message)}
            />
            <FieldError id="proposal-message" message={errors.message} />
          </div>
        </div>

        {note && (
          <Notice tone={note.tone} className="mt-[16px] lg:max-w-[700px]">
            {note.text}
          </Notice>
        )}

        {!customLocked && (
          <>
            <div className="mt-[22px] flex flex-wrap gap-[14px]">
              <button
                type="submit"
                className={cx(smallOutline, "min-w-[150px]")}
                style={OUTLINE_STYLE}
              >
                {busy === "save" ? "Saving…" : "Save proposal draft"}
              </button>
              <button
                type="button"
                onClick={() => void save("preview")}
                className={cx(smallPrimary, "min-w-[170px]")}
                style={PRIMARY_STYLE}
              >
                {busy === "preview" ? "Saving…" : "Review & send proposal"}
              </button>
            </div>
            <p className="mt-[8px] text-[11px]" style={{ color: BODY }}>
              “Review & send” saves the draft and opens the customer’s view; nothing is sent until
              you confirm there.
            </p>
          </>
        )}
      </fieldset>
      {customLocked && draftProposal && !closed && (
        <Link
          href={adminRoutes.enquiryProposal(e.id, draftProposal.id)}
          className={cx(smallPrimary, "mt-[22px] w-fit min-w-[170px]")}
          style={PRIMARY_STYLE}
        >
          Review & send proposal
        </Link>
      )}
    </form>
  );
}

/** Every version, newest first, with its price and status. */
function ProposalsTab({ enquiry: e, openForm }: { enquiry: Detail; openForm: () => void }) {
  if (!e.proposals.length)
    return (
      <p className="mt-[24px] text-[13px]" style={{ color: BODY }}>
        No proposal yet.{" "}
        <button type="button" onClick={openForm} className="underline underline-offset-2">
          Draft one on the Enquiry tab
        </button>
        .
      </p>
    );
  const closed = e.status === "closed";
  return (
    <ul className="mt-[24px] grid gap-[14px] lg:max-w-[880px]">
      {e.proposals.map((p, i) => {
        const can = proposalActions(p.status, closed);
        const pr = p.pricing;
        return (
          <li key={p.id} className="border border-[#dcdad5] bg-white px-[18px] py-[18px]">
            <div className="flex flex-wrap items-baseline justify-between gap-[8px]">
              <p className="text-[18px] leading-[24px]">
                Version {p.version} · {proposalStatusLabel(p.status)}
              </p>
              <p className="text-[15px]">
                {pr.total_amount === null ? "Total pending GST" : formatRupees(pr.total_amount)}
              </p>
            </div>
            <p className="mt-[6px] text-[12px] leading-[18px]" style={{ color: BODY }}>
              {p.yacht.name} · {dayText(p.date, true)} · {p.start_time}–{p.end_time} ·{" "}
              {proposalLengthText(p)} · {p.guests} guests
            </p>
            <p className="mt-[4px] text-[12px] leading-[18px]" style={{ color: BODY }}>
              Charter {formatRupees(pr.charter_amount)}
              {pr.addons.map((a) => ` · ${a.name} × ${a.quantity} ${formatRupees(a.amount)}`)}
              {" · "}Subtotal {formatRupees(pr.subtotal)}
              {pr.tax_amount !== null &&
                ` · GST${pr.tax_rate !== null ? ` ${pr.tax_rate}%` : ""} ${formatRupees(pr.tax_amount)}`}
            </p>
            <p className="mt-[4px] text-[11px]" style={{ color: BODY }}>
              Drafted {formatInstant(p.created_at)}
              {p.sent_at ? ` · sent ${formatInstant(p.sent_at)}` : ""}
              {p.expires_at
                ? ` · valid until ${formatInstant(p.expires_at)}`
                : p.status === "draft"
                  ? " · valid for 7 days once sent"
                  : ""}
              {p.decided_at ? ` · decided ${formatInstant(p.decided_at)}` : ""}
            </p>
            {p.inclusions.length > 0 && (
              <p className="mt-[6px] text-[12px]">Includes: {p.inclusions.join(" · ")}</p>
            )}
            {p.message && (
              <p className="mt-[6px] text-[12px] whitespace-pre-line">Message: {p.message}</p>
            )}
            {p.terms && (
              <p className="mt-[6px] line-clamp-3 text-[12px] whitespace-pre-line">
                Terms: {p.terms}
              </p>
            )}
            {p.decision_comment && (
              <p className="mt-[6px] text-[12px]">Customer’s comment: “{p.decision_comment}”</p>
            )}
            {i === 0 && (can.edit || can.revise) && (
              <div className="mt-[12px] flex flex-wrap gap-[12px]">
                {can.send && (
                  <Link
                    href={adminRoutes.enquiryProposal(e.id, p.id)}
                    className={cx(smallPrimary, "h-[36px] w-fit")}
                    style={PRIMARY_STYLE}
                  >
                    Review & send →
                  </Link>
                )}
                <button
                  type="button"
                  onClick={openForm}
                  className={cx(smallOutline, "h-[36px] w-fit")}
                  style={OUTLINE_STYLE}
                >
                  {can.edit ? "Edit draft" : "Revise on the Enquiry tab"}
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function HistoryTab({ enquiry: e }: { enquiry: Detail }) {
  const items = [
    { at: e.created_at, text: `Enquiry received from ${e.contact.full_name}` },
    ...e.history.map((h) => ({ at: h.created_at, text: historyText(h.action) })),
  ];
  return (
    <section aria-labelledby="enquiry-history" className="mt-[24px] lg:max-w-[880px]">
      <h2 id="enquiry-history" className="sr-only">
        History
      </h2>
      <ol className="border-l border-[#dcdad5] pl-[18px]">
        {items.map((h, i) => (
          <li key={i} className="relative pb-[16px] text-[13px]">
            <span
              aria-hidden="true"
              className="absolute top-[6px] -left-[23px] size-[9px] rounded-full bg-[#0d1b2a]"
            />
            {h.text}
            <span className="block text-[11px]" style={{ color: BODY }}>
              {formatInstant(h.at)}
            </span>
          </li>
        ))}
      </ol>
      <Link
        href={adminRoutes.auditFor("enquiry", e.id) as Route}
        className="text-[12px] underline underline-offset-2"
      >
        Full audit history for this enquiry
      </Link>
    </section>
  );
}
