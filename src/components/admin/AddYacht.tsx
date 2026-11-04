"use client";

import { ArrowRight, Check, Plus } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { adminRoutes } from "@/constants/routes";
import { BookingSetupFields } from "@/features/admin/fleet/components/booking-setup-fields";
import { YachtGallery, type QueuedPhoto } from "@/features/admin/fleet/components/yacht-gallery";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { usePublishBreadcrumbYacht } from "@/features/admin/fleet/hooks/use-breadcrumb-yacht";
import {
  EMPTY_BOOKING_SETUP,
  PACKAGES,
  bookingSetupErrors,
  draftFromSaved,
  hasPricedPackage,
  isSetupChanged,
  packagePriceId,
  priceChanges,
  repriceForRate,
  toSlotSetup,
  withSavedIds,
  type SavedBooking,
} from "@/features/admin/fleet/utils/booking-setup";
import { fleetErrorMessage } from "@/features/admin/fleet/utils/fleet-error-message";
import {
  EMPTY_FORM,
  LIST_ITEM_MAX,
  formFromTemplate,
  formFromYacht,
  toCreateInput,
  toPatch,
  validateForPublish,
  validateYachtForm,
  type YachtFormState,
} from "@/features/admin/fleet/utils/yacht-form";
import {
  activateYacht,
  attachPhotos,
  createYacht,
  deactivateYacht,
  getSlotTypes,
  getYacht,
  listActivePartners,
  listCruisingRegions,
  replaceSlotTypes,
  updateYacht,
  type YachtDetail,
  type YachtPhoto,
} from "@/services/admin/fleet.service";
import { uploadYachtPhoto } from "@/services/admin/media.service";
import {
  createPriceRule,
  deletePriceRule,
  listPriceRules,
  updatePriceRule,
} from "@/services/admin/pricing.service";
import { isApiError } from "@/services/http/api-error";
import { formatPaise, rupeesToPaise } from "@/features/admin/pricing/utils/pricing-form";
import { cx } from "@/lib/cx";

import { BODY, GRADIENT, INK, MUTED, SAND } from "./admin-theme";
import {
  ChipGroup,
  FieldError,
  Label,
  LoadState,
  Section,
  SelectBox,
  Toggle,
  chip,
  errorProps,
  input,
} from "./form-parts";

/* ------------------------------------------------------------------ */
/* Options                                                             */
/* ------------------------------------------------------------------ */

/** Suggestions only: the backend accepts any vessel type text and any amenity. */
const VESSEL_TYPES = ["Superyacht", "Motor yacht", "Sailing yacht", "Houseboat"];
const REGIONS = ["Kochi", "Lakshadweep", "Kerala Backwaters", "Malabar Coast", "The Maldives"];
const SUGGESTED_AMENITIES = [
  "Private chef",
  "Sun deck",
  "Ocean-view suites",
  "Water toys",
  "Snorkelling gear",
  "Jacuzzi",
  "Gym",
  "Wi-Fi at sea",
];
const BOOKING_MODES = [
  {
    value: "instant",
    title: "Instant booking",
    text: "Guests pick open dates and pay online.",
  },
  {
    value: "slots",
    title: "Slots + concierge",
    text: "Instant booking, plus custom-quote enquiries.",
  },
  {
    value: "enquiry",
    title: "Enquiry only",
    text: "No online payment — concierge sends a quote.",
  },
] as const;
const STATUSES = ["Active", "Inactive"] as const;
type Status = (typeof STATUSES)[number];
const TAGLINE_MAX = 120;

const TABS = [
  { id: "details", label: "Details" },
  { id: "specs", label: "Specs & story" },
  { id: "gallery", label: "Photos" },
  { id: "booking", label: "Booking" },
] as const;

/** Fields in page order, to scroll to the first one with an error. */
const FIELD_ORDER = [
  "yacht-name",
  "vessel-type",
  "home-port",
  "registration",
  "cruising-regions",
  "slug",
  "departure-points",
  "partner",
  "length",
  "capacity",
  "suites",
  "built",
  "speed",
  "tagline",
  "description",
  "amenities",
  "inclusions",
  "policies",
  "rate",
  "booking-first-start",
  "booking-last-return",
  ...PACKAGES.map((p) => packagePriceId(String(p.hours))),
];

const digits = (v: string) => v.replace(/\D/g, "");
/** The rate in paise; "15000." while typing counts as 15000. */
const hourlyPaise = (text: string) => rupeesToPaise(text.replace(/\.$/, ""));

/**
 * Chips for a list of short texts (amenities, inclusions, departure points),
 * ending with "+ Add …". That chip opens an input in place to type a new one.
 */
function ListField({
  id,
  label,
  required,
  hint,
  addLabel,
  values,
  options,
  maxLength,
  onChange,
  onOptionsChange,
  error,
  placeholder,
}: {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  addLabel: string;
  values: string[];
  options: string[];
  maxLength: number;
  onChange: (values: string[]) => void;
  onOptionsChange: (options: string[]) => void;
  error?: string;
  placeholder: string;
}) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  // Removed chips stay gone, including suggestions that come from outside this list.
  const [removed, setRemoved] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const add = () => {
    const value = draft.trim().slice(0, maxLength);
    if (value) {
      if (!options.includes(value)) onOptionsChange([...options, value]);
      if (!values.includes(value)) onChange([...values, value]);
      setRemoved((r) => r.filter((x) => x !== value));
    }
    setDraft("");
  };

  return (
    <div>
      <ChipGroup
        id={id}
        label={label}
        required={required}
        hint={hint}
        multiple
        options={options.filter((o) => !removed.includes(o)).map((o) => ({ value: o, label: o }))}
        selected={values}
        onToggle={(v) =>
          onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v])
        }
        onRemove={(v) => {
          setRemoved((r) => [...r, v]);
          if (values.includes(v)) onChange(values.filter((x) => x !== v));
        }}
        after={
          adding ? (
            <span className="flex w-full max-w-[380px] gap-[8px]">
              <input
                ref={inputRef}
                id={`${id}-add`}
                aria-label={addLabel}
                className={cx(input.replace("h-[52px]", "h-[44px]"), "min-w-0 flex-1 text-[13px]")}
                placeholder={placeholder}
                maxLength={maxLength}
                value={draft}
                onChange={(e) => setDraft(e.currentTarget.value)}
                onKeyDown={(e) => {
                  // Enter adds the item instead of submitting the whole form.
                  if (e.key === "Enter") {
                    e.preventDefault();
                    add();
                  } else if (e.key === "Escape") {
                    setDraft("");
                    setAdding(false);
                  }
                }}
              />
              <button
                type="button"
                onClick={add}
                disabled={!draft.trim()}
                className={cx(
                  chip,
                  "shrink-0 border-[#0d1b2a] bg-white hover:bg-[#f2f1ee] disabled:cursor-not-allowed disabled:border-[#dcdad5] disabled:text-[#a3a6aa]",
                )}
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft("");
                  setAdding(false);
                }}
                className="shrink-0 px-[6px] text-[12px] underline underline-offset-2 hover:opacity-70"
              >
                Done
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className={cx(
                chip,
                "flex items-center gap-[4px] border-[#dcdad5] bg-white hover:border-[#0d1b2a]",
              )}
            >
              <Plus aria-hidden="true" strokeWidth={1.5} className="size-[13px]" />
              {addLabel}
            </button>
          )
        }
      />
      <FieldError id={id} message={error} />
    </div>
  );
}

function PageIntro({ title, status }: { title: string; status?: ReactNode }) {
  return (
    <>
      <p className="text-[10px] tracking-[0.12em] uppercase" style={{ color: MUTED }}>
        Sithara Marina / Admin
      </p>
      <h1 className="mt-[18px] text-[30px] leading-[1.15] font-normal tracking-[-0.8px] lg:mt-[24px] lg:text-[43px] lg:tracking-[-1.3px]">
        {title}{" "}
        <em
          className="tracking-[-0.5px]"
          style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
        >
          in detail.
        </em>
      </h1>
      {status}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

/**
 * "A new vessel, in detail." — the add/edit yacht form from the admin Figma
 * design, with a live website preview and a ready-to-publish checklist.
 *
 * Create: POST /admin/yachts, then uploads the queued photos. Edit: loads
 * GET /admin/yachts/{id} and saves the changed fields with PATCH. Fields the
 * backend has no field for yet are shown, marked "Not saved yet", and not sent.
 */
export default function AddYacht({
  yachtId,
  duplicateId,
}: {
  /** Existing yacht to edit. */
  yachtId?: string;
  /** Yacht to copy into a new one ("Duplicate as new yacht"). */
  duplicateId?: string;
}) {
  const sourceId = yachtId ?? duplicateId;
  const source = useAdminQuery<{ yacht: YachtDetail; booking?: SavedBooking } | null>(
    async (signal) => {
      if (!sourceId) return null;
      if (!yachtId) return { yacht: await getYacht(sourceId, signal) };
      const [yacht, setup, rules] = await Promise.all([
        getYacht(sourceId, signal),
        getSlotTypes(sourceId, signal),
        listPriceRules(sourceId, { kind: "base" }, signal),
      ]);
      return { yacht, booking: { setup, rules } };
    },
    sourceId ?? "new",
  );
  usePublishBreadcrumbYacht(yachtId ? source.data?.yacht : undefined);

  if (source.loading || source.error) {
    return (
      <div className="px-[20px] pt-[20px] pb-[40px] lg:pt-[33px] lg:pr-[47px] lg:pl-[46px]">
        <PageIntro title={yachtId ? "Edit yacht," : "A new vessel,"} />
        <LoadState
          loading={source.loading}
          label="Loading the yacht"
          error={source.error ? `Couldn't load the yacht. ${fleetErrorMessage(source.error)}` : ""}
          onRetry={
            isApiError(source.error) && source.error.status === 404 ? undefined : source.reload
          }
        />
        {Boolean(source.error) && (
          <Link
            href={adminRoutes.fleet}
            className="text-[12px] underline underline-offset-2 hover:opacity-70"
          >
            Back to the fleet
          </Link>
        )}
      </div>
    );
  }

  const yacht = yachtId ? source.data?.yacht : undefined;
  const template = duplicateId ? source.data?.yacht : undefined;
  return (
    <YachtEditor
      key={sourceId ?? "new"}
      saved={yacht}
      savedBooking={source.data?.booking}
      template={template}
    />
  );
}

function YachtEditor({
  saved,
  savedBooking,
  template,
}: {
  saved?: YachtDetail;
  /** The yacht's slots and base prices, when editing. */
  savedBooking?: SavedBooking;
  template?: YachtDetail;
}) {
  const editing = Boolean(saved);
  const router = useRouter();
  const doneHref = saved ? adminRoutes.fleetYacht(saved.id) : adminRoutes.fleet;

  const [form, setForm] = useState<YachtFormState>(() =>
    saved
      ? formFromYacht(saved)
      : template
        ? formFromTemplate(template)
        : { ...EMPTY_FORM, type: VESSEL_TYPES[0]! },
  );
  const savedStatus: Status = saved && !saved.is_active ? "Inactive" : "Active";
  const [status, setStatus] = useState<Status>(savedStatus);
  const start = saved ?? template;
  const [amenityOptions, setAmenityOptions] = useState(() => [
    ...SUGGESTED_AMENITIES,
    ...(start?.amenities.filter((a) => !SUGGESTED_AMENITIES.includes(a)) ?? []),
  ]);
  const [inclusionOptions, setInclusionOptions] = useState(() => [...(start?.inclusions ?? [])]);
  const [pointOptions, setPointOptions] = useState(() => [...(start?.departure_points ?? [])]);
  const [regionOptions, setRegionOptions] = useState(() => [
    ...REGIONS,
    ...(start?.cruising_regions.filter((r) => !REGIONS.includes(r)) ?? []),
  ]);
  const [photos, setPhotos] = useState<YachtPhoto[]>(() => saved?.photos ?? []);
  const [queued, setQueued] = useState<QueuedPhoto[]>([]);
  // The backend's copy, kept current as parts of a save succeed so a retry is safe.
  const [bookingBase, setBookingBase] = useState(savedBooking);
  const [booking, setBooking] = useState(() =>
    savedBooking ? draftFromSaved(savedBooking, saved?.hourly_rate) : EMPTY_BOOKING_SETUP,
  );
  const [activeTab, setActiveTab] = useState<string>("details");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [problem, setProblem] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState("");
  const submittingRef = useRef(false);
  // The last usable rate, so clearing the field and typing a new one still updates prices.
  const lastRate = useRef(hourlyPaise(form.rate));

  const partners = useAdminQuery(
    (signal) => (form.ownership === "partner" ? listActivePartners(signal) : Promise.resolve(null)),
    form.ownership,
  );

  // Regions other yachts use, as extra suggestions; the form works without them.
  const usedRegions = useAdminQuery((signal) => listCruisingRegions(signal), "regions");

  const set = <K extends keyof YachtFormState>(key: K, value: YachtFormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setNotice("");
  };
  const clearError = (id: string) => {
    if (!errors[id]) return;
    setErrors((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  // Highlight the tab of the section in view.
  useEffect(() => {
    const els = TABS.map((t) => document.getElementById(t.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const top = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActiveTab(top.target.id);
      },
      { rootMargin: "-20% 0px -60% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const patch = useMemo(() => (saved ? toPatch(form, saved) : {}), [form, saved]);
  /** Active / Inactive are saved with POST …/activate or …/deactivate. */
  const statusChange = status !== savedStatus;
  const bookingChanged = bookingBase
    ? isSetupChanged(booking, bookingBase) ||
      priceChanges(booking, bookingBase.setup, bookingBase.rules).length > 0
    : false;
  const dirty = editing ? Object.keys(patch).length > 0 || statusChange || bookingChanged : true;

  /* Ready to publish — the items from the design. */
  const photoCount = editing ? photos.length : queued.length;
  const checks = [
    { label: "Yacht name", done: form.name.trim() !== "" },
    { label: "At least one region", done: form.regions.length > 0 },
    { label: "Maximum guests", done: Number(form.capacity) > 0 },
    { label: "Card tagline", done: form.tagline.trim() !== "" },
    { label: "At least one photo", done: photoCount > 0 },
    { label: "Package with a price", done: hasPricedPackage(booking) },
  ];
  const doneCount = checks.filter((c) => c.done).length;

  function focusField(id: string) {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    const target = el?.matches("input, textarea, select, button")
      ? el
      : el?.querySelector("button");
    (target as HTMLElement | null | undefined)?.focus({ preventScroll: true });
  }

  function showErrors(found: Record<string, string>) {
    setErrors(found);
    const count = Object.keys(found).length;
    setProblem(`Check ${count} ${count === 1 ? "field" : "fields"} before saving.`);
    // Custom packages aren't in the fixed order; they come last on the page.
    const first = FIELD_ORDER.find((id) => found[id]) ?? Object.keys(found)[0];
    if (first) focusField(first);
  }

  /** Puts a backend refusal next to the field it is about, when it is about one. */
  function showSaveError(err: unknown) {
    const code = isApiError(err) ? err.code : undefined;
    if (code === "NOT_PUBLISHABLE" && editing) {
      setProblem(
        "This yacht is visible on the website, so it needs at least one package that is on and has a price. Keep one, or hide the yacht first.",
      );
      return;
    }
    if (code === "SLUG_EXISTS") return showErrors({ slug: fleetErrorMessage(err) });
    if (code === "REGISTRATION_NUMBER_EXISTS")
      return showErrors({ registration: fleetErrorMessage(err) });
    if (code === "INVALID_YACHT_YEARS") return showErrors({ built: fleetErrorMessage(err) });
    if (code === "INVALID_PARTNER") return showErrors({ partner: fleetErrorMessage(err) });
    setProblem(`Couldn't save the yacht. ${fleetErrorMessage(err)}`);
  }

  async function uploadQueued(yachtId: string): Promise<boolean> {
    let done = 0;
    setSubmitting(`Uploading photos 0 of ${queued.length}…`);
    const results = await Promise.allSettled(
      queued.map(async (p) => {
        const mediaId = await uploadYachtPhoto(p.file);
        done += 1;
        setSubmitting(`Uploading photos ${done} of ${queued.length}…`);
        return mediaId;
      }),
    );
    const mediaIds = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    if (mediaIds.length) {
      try {
        await attachPhotos(yachtId, mediaIds);
      } catch {
        return false;
      }
    }
    return mediaIds.length === queued.length;
  }

  /**
   * "Publish yacht" and "Save as draft" both create the yacht hidden, because
   * the backend refuses a visible new yacht. Publish then makes it visible, once
   * its package prices and photos are saved.
   */
  async function save(intent: "publish" | "draft" | "update") {
    if (submittingRef.current) return;
    const found = {
      ...validateYachtForm(form, editing),
      ...(intent === "publish" ? validateForPublish(form) : {}),
      ...bookingSetupErrors(booking, bookingBase),
    };
    if (Object.keys(found).length) return showErrors(found);
    if (editing && !dirty) {
      setProblem("");
      setNotice("No changes to save.");
      return;
    }

    submittingRef.current = true;
    setProblem("");
    setNotice("");
    setSubmitting(
      intent === "update" ? "Saving…" : intent === "publish" ? "Publishing…" : "Saving draft…",
    );
    try {
      if (saved) {
        // Hide first and publish last, so the yacht is never visible without a priced package.
        const hiding = patch.is_visible === false;
        const hasPatch = Object.keys(patch).length > 0;
        if (hiding) await updateYacht(saved.id, patch);
        if (bookingChanged) await saveBooking(saved.id, bookingBase);
        if (hasPatch && !hiding) await updateYacht(saved.id, patch);
        if (statusChange) {
          await (status === "Active" ? activateYacht(saved.id) : deactivateYacht(saved.id));
        }
        router.push(`${adminRoutes.fleetYacht(saved.id)}?notice=saved` as Route);
        return;
      }
      const created = await createYacht(toCreateInput(form));
      // The yacht exists from here on; later steps never create it again, and a
      // failure sends the admin to the page where that step can be finished.
      router.push((await finishNewYacht(created.id, intent)) as Route);
    } catch (err) {
      showSaveError(err);
      submittingRef.current = false;
      setSubmitting("");
    }
  }

  /**
   * PUT …/slot-types with every package, then the price rule changes. `base` is
   * what is saved already (nothing, for a new yacht). Each success is recorded,
   * so saving again after a failure carries on instead of repeating it.
   */
  async function saveBooking(id: string, base?: SavedBooking) {
    let current = base;
    if (!base || isSetupChanged(booking, base)) {
      const setup = await replaceSlotTypes(id, toSlotSetup(booking, base));
      const kept = new Set(setup.slot_types.map((s) => s.id));
      current = { setup, rules: (base?.rules ?? []).filter((r) => kept.has(r.slot_type_id)) };
      setBookingBase(current);
      setBooking((draft) => withSavedIds(draft, setup));
    }
    const { setup } = current!;
    let rules = current!.rules;
    for (const change of priceChanges(booking, setup, rules)) {
      if (change.type === "create") {
        rules = [...rules, await createPriceRule(id, change.input)];
      } else if (change.type === "update") {
        const updated = await updatePriceRule(change.ruleId, { amount: change.amount });
        rules = rules.map((r) => (r.id === updated.id ? updated : r));
      } else {
        await deletePriceRule(change.ruleId);
        rules = rules.filter((r) => r.id !== change.ruleId);
      }
      setBookingBase({ setup, rules });
    }
  }

  /** After POST /admin/yachts: hours and packages, photos, publishing. Returns where to go. */
  async function finishNewYacht(id: string, intent: "publish" | "draft" | "update") {
    let setupOk = true;
    setSubmitting("Saving packages…");
    try {
      await saveBooking(id);
    } catch {
      setupOk = false;
    }
    const photosOk = queued.length === 0 || (await uploadQueued(id));

    let next = `${adminRoutes.fleetYacht(id)}?notice=created`;
    if (!setupOk) next = `${adminRoutes.fleetYachtPricing(id)}?notice=setup`;
    else if (!photosOk) next = `${adminRoutes.fleetYacht(id)}?notice=no-photos`;
    else if (intent === "publish" && !hasPricedPackage(booking))
      next = `${adminRoutes.fleetYachtPricing(id)}?notice=publish`;
    else if (intent === "publish" && queued.length > 0) {
      setSubmitting("Publishing…");
      next = await updateYacht(id, { is_visible: true }).then(
        () => `${adminRoutes.fleetYacht(id)}?notice=published`,
        () => `${adminRoutes.fleetYacht(id)}?notice=not-published`,
      );
    }
    if (status === "Inactive") await deactivateYacht(id).catch(() => undefined);
    return next;
  }

  const cover = editing ? photos[0]?.url : queued[0]?.src;
  const rate = rupeesToPaise(form.rate);
  const partnerOptions = (() => {
    const list = partners.data ?? [];
    const current = saved?.partner;
    const all =
      current && !list.some((p) => p.id === current.id)
        ? [...list, { ...current, is_active: false }]
        : list;
    return [
      { value: "", label: partners.loading ? "Loading partners…" : "Choose a partner" },
      ...all.map((p) => ({ value: p.id, label: p.is_active ? p.name : `${p.name} (inactive)` })),
    ];
  })();
  const typeOptions = [
    ...VESSEL_TYPES,
    ...(form.type && !VESSEL_TYPES.includes(form.type) ? [form.type] : []),
  ].map((t) => ({ value: t, label: t }));
  const statusLabel = editing ? (dirty ? "Unsaved changes" : "All changes saved") : "Unsaved draft";

  return (
    <div>
      <div className="px-[20px] pt-[20px] pb-[40px] lg:pt-[33px] lg:pr-[47px] lg:pl-[46px]">
        <PageIntro
          title={saved ? `${saved.name},` : "A new vessel,"}
          status={
            <p
              className="mt-[10px] flex items-center gap-[6px] text-[12px]"
              style={{ color: BODY }}
            >
              {editing ? "Edit yacht" : "Add yacht"}
              <span aria-hidden="true">·</span>
              <span
                role="status"
                className="border border-[#dcdad5] px-[7px] py-[2px] text-[11px]"
                style={{ backgroundColor: SAND }}
              >
                {statusLabel}
              </span>
            </p>
          }
        />

        <nav aria-label="Form sections" className="mt-[28px] flex flex-wrap gap-[12px]">
          {TABS.map((t) => {
            const on = activeTab === t.id;
            return (
              <a
                key={t.id}
                href={`#${t.id}`}
                aria-current={on ? "true" : undefined}
                onClick={() => setActiveTab(t.id)}
                className={cx(
                  "flex h-[48px] min-w-[104px] items-center justify-center border px-[20px] text-[12px] transition-colors",
                  on ? "border-transparent" : "border-[#0d1b2a] bg-white hover:bg-[#f2f1ee]",
                )}
                style={on ? { background: GRADIENT } : undefined}
              >
                {t.label}
              </a>
            );
          })}
        </nav>

        <form
          noValidate
          aria-busy={Boolean(submitting)}
          onSubmit={(e) => {
            e.preventDefault();
            void save(editing ? "update" : "publish");
          }}
          className="mt-[32px] grid gap-[24px] xl:grid-cols-[minmax(0,1fr)_304px] xl:gap-[31px]"
        >
          <div className="flex min-w-0 flex-col gap-[24px]">
            {/* 01 Details */}
            <Section id="details" number="01" title="Details">
              <div className="grid gap-x-[20px] gap-y-[22px] sm:grid-cols-2">
                <div>
                  <Label htmlFor="yacht-name" required>
                    Yacht name
                  </Label>
                  <input
                    id="yacht-name"
                    className={input}
                    placeholder="e.g. Astra Two"
                    maxLength={100}
                    value={form.name}
                    onChange={(e) => {
                      set("name", e.currentTarget.value);
                      clearError("yacht-name");
                    }}
                    {...errorProps("yacht-name", errors["yacht-name"])}
                  />
                  <FieldError id="yacht-name" message={errors["yacht-name"]} />
                </div>
                <div>
                  <Label htmlFor="vessel-type">Vessel type</Label>
                  <SelectBox
                    id="vessel-type"
                    value={form.type}
                    onChange={(v) => set("type", v)}
                    options={typeOptions}
                  />
                </div>
                <div>
                  <Label htmlFor="home-port">Home port</Label>
                  <input
                    id="home-port"
                    className={input}
                    placeholder="e.g. Kochi Marina"
                    maxLength={100}
                    value={form.departureCity}
                    onChange={(e) => {
                      set("departureCity", e.currentTarget.value);
                      clearError("home-port");
                    }}
                    {...errorProps("home-port", errors["home-port"])}
                  />
                  <FieldError id="home-port" message={errors["home-port"]} />
                </div>
                <div>
                  <Label htmlFor="registration">Registration no.</Label>
                  <input
                    id="registration"
                    className={input}
                    placeholder="Shown to staff only"
                    maxLength={50}
                    autoCapitalize="characters"
                    spellCheck={false}
                    value={form.registration}
                    onChange={(e) => {
                      set("registration", e.currentTarget.value);
                      clearError("registration");
                    }}
                    {...errorProps("registration", errors["registration"])}
                  />
                  <FieldError id="registration" message={errors["registration"]} />
                </div>
              </div>
              <div className="mt-[24px]">
                <ListField
                  id="cruising-regions"
                  label="Cruising regions"
                  required
                  hint="choose all that apply"
                  addLabel="Add region"
                  placeholder="e.g. Vembanad Lake"
                  values={form.regions}
                  options={[...new Set([...regionOptions, ...(usedRegions.data ?? [])])]}
                  maxLength={LIST_ITEM_MAX.regions}
                  onChange={(v) => {
                    set("regions", v);
                    clearError("cruising-regions");
                  }}
                  onOptionsChange={setRegionOptions}
                  error={errors["cruising-regions"]}
                />
              </div>
              <div className="mt-[24px]">
                <ChipGroup
                  label="Ownership"
                  required
                  options={[
                    { value: "own", label: "Owned" },
                    { value: "partner", label: "Partner-owned" },
                  ]}
                  selected={[form.ownership]}
                  onToggle={(v) => {
                    set("ownership", v as YachtFormState["ownership"]);
                    clearError("partner");
                  }}
                />
              </div>
              {form.ownership === "partner" && (
                <div className="mt-[22px] max-w-[365px]">
                  <Label htmlFor="partner" required>
                    Partner
                  </Label>
                  <SelectBox
                    id="partner"
                    value={form.partnerId}
                    onChange={(v) => {
                      set("partnerId", v);
                      clearError("partner");
                    }}
                    options={partnerOptions}
                    disabled={partners.loading}
                    invalid={errors["partner"]}
                  />
                  <FieldError id="partner" message={errors["partner"]} />
                  {Boolean(partners.error) && (
                    <p className="mt-[6px] text-[11px] leading-[16px] text-[#9b2c2c]">
                      Couldn&rsquo;t load partners. {fleetErrorMessage(partners.error, "This list")}{" "}
                      <button type="button" onClick={partners.reload} className="underline">
                        Try again
                      </button>
                    </p>
                  )}
                  {partners.data?.length === 0 && (
                    <p className="mt-[6px] text-[11px] leading-[16px]" style={{ color: BODY }}>
                      There are no active partners yet. Add one under Partners first.
                    </p>
                  )}
                </div>
              )}

              {/* Saved fields the design doesn't show; editable on existing yachts. */}
              {editing && (
                <>
                  <div className="mt-[24px] max-w-[365px]">
                    <Label htmlFor="slug" required hint="used in the yacht's web address">
                      URL name
                    </Label>
                    <input
                      id="slug"
                      className={input}
                      maxLength={100}
                      autoCapitalize="none"
                      spellCheck={false}
                      value={form.slug}
                      onChange={(e) => {
                        set("slug", e.currentTarget.value.toLowerCase());
                        clearError("slug");
                      }}
                      {...errorProps("slug", errors["slug"])}
                    />
                    <FieldError id="slug" message={errors["slug"]} />
                  </div>
                  <div className="mt-[24px]">
                    <ListField
                      id="departure-points"
                      label="Departure points"
                      hint="jetties guests can board from"
                      addLabel="Add departure point"
                      placeholder="e.g. Marina Mall Jetty"
                      values={form.departurePoints}
                      options={pointOptions}
                      maxLength={LIST_ITEM_MAX.departurePoints}
                      onChange={(v) => {
                        set("departurePoints", v);
                        clearError("departure-points");
                      }}
                      onOptionsChange={setPointOptions}
                      error={errors["departure-points"]}
                    />
                  </div>
                </>
              )}
            </Section>

            {/* 02 Specs & story */}
            <Section id="specs" number="02" title="Specs & story">
              <div className="grid grid-cols-2 gap-x-[20px] gap-y-[22px] md:grid-cols-4">
                {(
                  [
                    ["length", "Length (metres)", "46", false],
                    ["capacity", "Maximum guests", "12", true],
                    ["suites", "Suites", "6", false],
                  ] as const
                ).map(([key, label, ph, req]) => (
                  <div key={key}>
                    <Label htmlFor={key} required={req}>
                      {label}
                    </Label>
                    <input
                      id={key}
                      inputMode="numeric"
                      className={input}
                      placeholder={ph}
                      maxLength={4}
                      value={form[key]}
                      onChange={(e) => {
                        set(key, digits(e.currentTarget.value));
                        clearError(key);
                      }}
                      {...errorProps(key, errors[key])}
                    />
                    <FieldError id={key} message={errors[key]} />
                  </div>
                ))}
                <div>
                  <Label htmlFor="built">Built / refit</Label>
                  <input
                    id="built"
                    className={input}
                    placeholder="2019 / 2024"
                    value={form.built}
                    onChange={(e) => {
                      set("built", e.currentTarget.value);
                      clearError("built");
                    }}
                    {...errorProps("built", errors["built"])}
                  />
                  <FieldError id="built" message={errors["built"]} />
                </div>
                <div>
                  <Label htmlFor="speed">Cruising speed (kn)</Label>
                  <input
                    id="speed"
                    inputMode="decimal"
                    className={input}
                    placeholder="12"
                    value={form.speed}
                    onChange={(e) => {
                      set("speed", e.currentTarget.value.replace(/[^\d.]/g, ""));
                      clearError("speed");
                    }}
                    {...errorProps("speed", errors["speed"])}
                  />
                  <FieldError id="speed" message={errors["speed"]} />
                </div>
              </div>

              <div className="mt-[24px]">
                <div className="flex items-baseline justify-between gap-4">
                  <Label htmlFor="tagline" required hint="shown on yacht cards and search">
                    Card tagline
                  </Label>
                  <span className="text-[11px]" style={{ color: MUTED }} aria-live="polite">
                    {form.tagline.length}/{TAGLINE_MAX}
                  </span>
                </div>
                <input
                  id="tagline"
                  maxLength={TAGLINE_MAX}
                  className={input}
                  placeholder="Spacious suites, open-air living, and the freedom to venture further."
                  value={form.tagline}
                  onChange={(e) => {
                    set("tagline", e.currentTarget.value);
                    clearError("tagline");
                  }}
                  {...errorProps("tagline", errors["tagline"])}
                />
                <FieldError id="tagline" message={errors["tagline"]} />
              </div>

              <div className="mt-[24px]">
                <Label htmlFor="description">
                  Full description
                  <span className="block text-[#8a8d91]">
                    — the “Life aboard” story on the yacht page
                  </span>
                </Label>
                <textarea
                  id="description"
                  rows={6}
                  maxLength={10_000}
                  className={cx(input, "h-auto min-h-[156px] resize-y py-[14px] leading-[22px]")}
                  placeholder="A world of your own, with the horizon as its only boundary…"
                  value={form.description}
                  onChange={(e) => set("description", e.currentTarget.value)}
                  {...errorProps("description", errors["description"])}
                />
                <FieldError id="description" message={errors["description"]} />
              </div>

              <div className="mt-[24px]">
                <ListField
                  id="amenities"
                  label="Amenities"
                  addLabel="Add amenity"
                  placeholder="e.g. Jacuzzi"
                  values={form.amenities}
                  options={amenityOptions}
                  maxLength={LIST_ITEM_MAX.amenities}
                  onChange={(v) => set("amenities", v)}
                  onOptionsChange={setAmenityOptions}
                  error={errors["amenities"]}
                />
              </div>

              {/* Saved fields the design doesn't show; editable on existing yachts. */}
              {editing && (
                <>
                  <div className="mt-[24px]">
                    <ListField
                      id="inclusions"
                      label="Inclusions"
                      hint="included in every charter"
                      addLabel="Add inclusion"
                      placeholder="e.g. Soft drinks"
                      values={form.inclusions}
                      options={inclusionOptions}
                      maxLength={LIST_ITEM_MAX.inclusions}
                      onChange={(v) => set("inclusions", v)}
                      onOptionsChange={setInclusionOptions}
                      error={errors["inclusions"]}
                    />
                  </div>
                  <div className="mt-[24px]">
                    <Label htmlFor="policies" hint="shown to guests before they book">
                      Policies
                    </Label>
                    <textarea
                      id="policies"
                      rows={4}
                      maxLength={10_000}
                      className={cx(
                        input,
                        "h-auto min-h-[112px] resize-y py-[14px] leading-[22px]",
                      )}
                      value={form.policies}
                      onChange={(e) => set("policies", e.currentTarget.value)}
                      {...errorProps("policies", errors["policies"])}
                    />
                    <FieldError id="policies" message={errors["policies"]} />
                  </div>
                </>
              )}
            </Section>

            {/* 03 Gallery */}
            <Section id="gallery" number="03" title="Gallery">
              {saved ? (
                <YachtGallery
                  mode="live"
                  yachtId={saved.id}
                  photos={photos}
                  onPhotosChange={setPhotos}
                />
              ) : (
                <YachtGallery mode="queued" queued={queued} onQueuedChange={setQueued} />
              )}
            </Section>

            {/* 04 Booking & pricing */}
            <Section id="booking" number="04" title="Booking & pricing">
              <fieldset>
                <legend className="contents">
                  <Label as="p">Booking mode</Label>
                </legend>
                <div className="grid gap-[14px] md:grid-cols-3">
                  {BOOKING_MODES.map((m) => {
                    const on = form.mode === m.value;
                    return (
                      <label
                        key={m.value}
                        className={cx(
                          "flex cursor-pointer gap-[12px] border px-[16px] py-[16px] transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[#0d1b2a]",
                          on
                            ? "border-[#0d1b2a]"
                            : "border-[#dcdad5] bg-white hover:border-[#9a9da1]",
                        )}
                        style={on ? { backgroundColor: SAND } : undefined}
                      >
                        <input
                          type="radio"
                          name="mode"
                          value={m.value}
                          checked={on}
                          onChange={() => set("mode", m.value)}
                          className="peer sr-only"
                        />
                        <span
                          aria-hidden="true"
                          className={cx(
                            "mt-[2px] flex size-[16px] shrink-0 items-center justify-center rounded-full border",
                            on ? "border-[#0d1b2a]" : "border-[#b5b8bc]",
                          )}
                        >
                          {on && <span className="size-[8px] rounded-full bg-[#0d1b2a]" />}
                        </span>
                        <span>
                          <span className="block text-[13px] leading-[18px]">{m.title}</span>
                          <span
                            className="mt-[4px] block text-[11px] leading-[17px]"
                            style={{ color: BODY }}
                          >
                            {m.text}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div className="mt-[24px] grid grid-cols-2 gap-x-[20px] gap-y-[22px] md:grid-cols-3">
                <div className="col-span-2 md:col-span-1">
                  <Label htmlFor="rate" hint="excl. GST">
                    Hourly rate (₹)
                  </Label>
                  <input
                    id="rate"
                    inputMode="decimal"
                    className={input}
                    placeholder="15000"
                    value={form.rate}
                    onChange={(e) => {
                      const text = e.currentTarget.value.replace(/[^\d.,]/g, "");
                      set("rate", text);
                      clearError("rate");
                      const next = hourlyPaise(text);
                      if (!next) return;
                      const previous = lastRate.current;
                      setBooking((draft) => repriceForRate(draft, previous, next));
                      lastRate.current = next;
                    }}
                    {...errorProps("rate", errors["rate"])}
                  />
                  <FieldError id="rate" message={errors["rate"]} />
                </div>
              </div>
              <p className="mt-[22px] text-[12px]" style={{ color: BODY }} aria-live="polite">
                {rate
                  ? `${formatPaise(rate)} per hour. Package prices below are worked out from this.`
                  : "Set an hourly rate to work out the package prices below."}
              </p>
              <BookingSetupFields
                draft={booking}
                hourlyRate={rate}
                errors={errors}
                onChange={setBooking}
                onClearError={clearError}
              />
            </Section>

            {/* 05 Publishing */}
            <Section id="publishing" number="05" title="Publishing">
              <Toggle
                id="visible"
                label="Visible on website"
                text={
                  editing
                    ? "Appears in yacht search and the collection."
                    : "Appears in yacht search and the collection. New yachts start hidden: “Publish yacht” makes it visible once it has a priced package and a photo."
                }
                checked={editing ? form.visible : false}
                disabled={!editing}
                onChange={(v) => set("visible", v)}
              />
              <Toggle
                id="featured"
                label="Feature on homepage"
                text="Shown in the “Featured yacht” carousel."
                checked={form.featured}
                onChange={(v) => set("featured", v)}
              />
              <div className="mt-[22px] max-w-[365px]">
                <Label htmlFor="status">Operational status</Label>
                <SelectBox
                  id="status"
                  value={status}
                  onChange={(v) => setStatus(v as Status)}
                  options={[...STATUSES]}
                />
              </div>
            </Section>
          </div>

          {/* Preview + checklist */}
          <div className="flex flex-col gap-[24px] max-xl:order-first xl:top-[24px] xl:self-start [@media(min-height:760px)]:xl:sticky">
            <aside
              aria-label="Website preview"
              className="border border-[#dcdad5] bg-white px-[20px] pt-[18px] pb-[22px]"
            >
              <p className="text-[10px] tracking-[0.12em] uppercase" style={{ color: MUTED }}>
                Website preview
              </p>
              <div className="relative mt-[12px]">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element -- live preview of the chosen cover
                  <img src={cover} alt="" className="aspect-[264/156] w-full object-cover" />
                ) : (
                  <div className="aspect-[264/156] w-full bg-[#eceae6]" />
                )}
                {(form.regions[0] || form.departureCity.trim()) && (
                  <span className="absolute top-[8px] left-[8px] bg-white px-[7px] py-[2px] text-[11px]">
                    {form.regions[0] || form.departureCity.trim()}
                  </span>
                )}
              </div>
              <p
                className={cx(
                  "mt-[16px] text-[26px] leading-[32px] tracking-[-0.5px] break-words",
                  !form.name && "text-[#b8bbbf]",
                )}
              >
                {form.name || "Yacht name"}
              </p>
              <p className="mt-[4px] text-[11px]" style={{ color: MUTED }}>
                {form.length || "—"} metres | {form.capacity || "—"} guests | {form.suites || "—"}{" "}
                suites
              </p>
              <p className="mt-[10px] text-[13px] leading-[19px]">
                {form.tagline || "Your card tagline appears here."}
              </p>
              <span className="mt-[14px] inline-flex items-center gap-[6px] border-b border-current pb-[3px] text-[11px] tracking-[0.12em] uppercase">
                Discover yacht
                <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-[11px]" />
              </span>
            </aside>

            <aside
              aria-label="Ready to publish"
              className="border border-[#dcdad5] bg-white px-[20px] pt-[18px] pb-[20px]"
            >
              <div className="flex items-baseline justify-between">
                <p className="text-[10px] tracking-[0.12em] uppercase" style={{ color: MUTED }}>
                  Ready to publish
                </p>
                <p className="text-[11px]" aria-live="polite">
                  {doneCount} of {checks.length}
                </p>
              </div>
              <ul className="mt-[12px] flex flex-col gap-[10px] text-[13px]">
                {checks.map((c) => (
                  <li
                    key={c.label}
                    className={cx("flex items-center gap-[10px]", !c.done && "text-[#6b7075]")}
                  >
                    <span
                      aria-hidden="true"
                      className={cx(
                        "flex size-[18px] shrink-0 items-center justify-center rounded-full border",
                        c.done ? "border-[#0d1b2a] bg-[#0d1b2a] text-white" : "border-[#c4c7cb]",
                      )}
                    >
                      {c.done && <Check className="size-[11px]" strokeWidth={3} />}
                    </span>
                    {c.label}
                    <span className="sr-only">{c.done ? "(done)" : "(to do)"}</span>
                  </li>
                ))}
              </ul>
            </aside>
          </div>

          {/* Sticky action bar */}
          <div
            className="sticky bottom-0 z-10 -mx-[20px] border-t border-[#dcdad5] px-[20px] py-[16px] xl:col-span-2 lg:-mr-[47px] lg:-ml-[46px] lg:pr-[47px] lg:pl-[46px]"
            style={{ backgroundColor: "#f8f7f4" }}
          >
            {(problem || notice) && (
              <p
                role={problem ? "alert" : "status"}
                className={cx("mb-[12px] text-[12px]", problem && "text-[#9b2c2c]")}
              >
                {problem || notice}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-[16px]">
              <button
                type="submit"
                disabled={Boolean(submitting)}
                className="flex h-[52px] min-w-[176px] items-center justify-center px-[20px] text-[12px] transition-opacity hover:opacity-90 disabled:cursor-wait disabled:opacity-70"
                style={{ background: GRADIENT }}
              >
                {submitting || (editing ? "Save changes" : "Publish yacht")}
              </button>
              {!editing && (
                <button
                  type="button"
                  disabled={Boolean(submitting)}
                  onClick={() => void save("draft")}
                  className="flex h-[52px] w-[166px] items-center justify-center border bg-white text-[12px] transition-colors hover:bg-[#f2f1ee] disabled:cursor-wait disabled:opacity-60"
                  style={{ borderColor: INK }}
                >
                  Save as draft
                </button>
              )}
              <Link
                href={doneHref}
                className="ml-[12px] text-[12px] underline underline-offset-2 hover:opacity-70"
              >
                Cancel
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
