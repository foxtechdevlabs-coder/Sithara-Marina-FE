"use client";

import { ArrowRight, Check, ChevronDown, Clock, GripVertical, Plus, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type ReactNode,
} from "react";

import { adminRoutes } from "@/constants/routes";
import { cx } from "@/lib/cx";

import { BODY, GRADIENT, INK, MUTED, SAND } from "./admin-theme";
import type { FleetRecord, YachtForm } from "./fleet-data";

/* ------------------------------------------------------------------ */
/* Options (DUMMY until the fleet API defines them)                    */
/* ------------------------------------------------------------------ */

const VESSEL_TYPES = ["Superyacht", "Motor yacht", "Sailing yacht", "Houseboat"];
const REGIONS = ["Kochi", "Lakshadweep", "Kerala Backwaters", "Malabar Coast", "The Maldives"];
const DEFAULT_AMENITIES = [
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
const STATUSES = ["Active", "Inactive", "Under maintenance"];
const TAGLINE_MAX = 120;

// Sample photos so the gallery matches the design; uploads are added after them.
const SAMPLE_PHOTOS = [
  { src: "/images/yachts/astra-one-arabian-sea.png", alt: "Yacht cruising off the coast" },
  { src: "/images/yachts/astra-one-master-suite.png", alt: "Master suite" },
  { src: "/images/yachts/astra-one-dining.png", alt: "Dining saloon" },
  { src: "/images/yachts/astra-one-saloon.png", alt: "Main saloon" },
];

const TABS = [
  { id: "details", label: "Details" },
  { id: "specs", label: "Specs & story" },
  { id: "gallery", label: "Photos" },
  { id: "booking", label: "Booking" },
] as const;

interface Photo {
  id: string;
  src: string;
  alt: string;
  /** Blob URL from an upload; revoked when removed. */
  uploaded?: boolean;
}

const INITIAL: YachtForm = {
  name: "",
  type: "Superyacht",
  port: "",
  registration: "",
  regions: ["Kochi"],
  ownership: "owned",
  length: "",
  guests: "",
  suites: "",
  crew: "",
  built: "",
  speed: "",
  tagline: "",
  description: "",
  amenities: ["Private chef", "Sun deck"],
  mode: "slots",
  rate: "",
  minDays: "",
  deposit: "",
  embark: "10:00",
  disembark: "17:00",
  visible: true,
  featured: false,
  status: "Active",
};

/* ------------------------------------------------------------------ */
/* Building blocks                                                     */
/* ------------------------------------------------------------------ */

const input =
  "h-[52px] w-full border border-[#dcdad5] bg-white px-[16px] text-[14px] text-[#0d1b2a] outline-none transition-colors placeholder:text-[#a3a6aa] focus:border-[#0d1b2a]";
const chip =
  "h-[44px] border px-[16px] text-[13px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d1b2a]";

function Label({
  htmlFor,
  children,
  required,
  hint,
  as: Tag = "label",
}: {
  htmlFor?: string;
  children: ReactNode;
  required?: boolean;
  hint?: string;
  as?: "label" | "p";
}) {
  return (
    <Tag
      {...(Tag === "label" ? { htmlFor } : {})}
      className="mb-[8px] block text-[11px] leading-[16px]"
      style={{ color: BODY }}
    >
      {children}
      {required && <span aria-hidden="true"> *</span>}
      {hint && <span className="text-[#8a8d91]"> — {hint}</span>}
    </Tag>
  );
}

function Section({
  id,
  number,
  title,
  children,
}: {
  id: string;
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-[24px] border border-[#dcdad5] bg-white px-[20px] pt-[28px] pb-[32px] sm:px-[28px]"
    >
      <h2 id={`${id}-title`} className="flex items-baseline gap-[10px] text-[22px] leading-[28px]">
        <span className="text-[11px]" style={{ color: MUTED }}>
          {number}
        </span>
        {title}
      </h2>
      <div className="mt-[24px]">{children}</div>
    </section>
  );
}

function ChipGroup({
  label,
  required,
  hint,
  options,
  selected,
  onToggle,
  multiple,
  after,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
  multiple?: boolean;
  after?: ReactNode;
}) {
  return (
    <fieldset>
      <legend className="contents">
        <Label as="p" required={required} hint={hint}>
          {label}
        </Label>
      </legend>
      <div className="flex flex-wrap gap-[10px]" role={multiple ? "group" : "radiogroup"}>
        {options.map((o) => {
          const on = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              role={multiple ? undefined : "radio"}
              aria-pressed={multiple ? on : undefined}
              aria-checked={multiple ? undefined : on}
              onClick={() => onToggle(o.value)}
              className={cx(
                chip,
                on
                  ? "border-[#0d1b2a] bg-[#0d1b2a] text-white"
                  : "border-[#dcdad5] bg-white hover:border-[#0d1b2a]",
              )}
            >
              {o.label}
            </button>
          );
        })}
        {after}
      </div>
    </fieldset>
  );
}

function Toggle({
  id,
  label,
  text,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  text: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-[#eceae6] py-[16px] first:pt-0">
      <div>
        <label htmlFor={id} className="block text-[14px] leading-[20px]">
          {label}
        </label>
        <p
          id={`${id}-text`}
          className="mt-[2px] text-[11px] leading-[16px]"
          style={{ color: BODY }}
        >
          {text}
        </p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={`${id}-text`}
        onClick={() => onChange(!checked)}
        className={cx(
          "relative h-[26px] w-[46px] shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d1b2a]",
          checked ? "bg-[#0d1b2a]" : "bg-[#d5d3cf]",
        )}
      >
        <span
          aria-hidden="true"
          className={cx(
            "absolute top-[3px] size-[20px] rounded-full bg-white transition-[left] motion-reduce:transition-none",
            checked ? "left-[23px]" : "left-[3px]",
          )}
        />
      </button>
    </div>
  );
}

function SelectBox({
  id,
  value,
  onChange,
  options,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        className={cx(input, "cursor-pointer appearance-none pr-10")}
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        strokeWidth={1.75}
        className="pointer-events-none absolute top-1/2 right-[14px] size-4 -translate-y-1/2"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

/**
 * "A new vessel, in detail." — the add-yacht form from the admin Figma design,
 * with a live website preview and a ready-to-publish checklist.
 *
 * UI ONLY: nothing is sent anywhere yet. Publish checks the required items and
 * returns to the fleet; replace `publish` / `saveDraft` with the fleet API.
 */
export default function AddYacht({
  yacht,
  template,
}: {
  /** Existing yacht to edit. */
  yacht?: FleetRecord;
  /** Yacht to copy into a new one ("Duplicate as new yacht"). */
  template?: FleetRecord;
}) {
  const editing = Boolean(yacht);
  const start = yacht ?? template;
  const doneHref = yacht ? adminRoutes.fleetYacht(yacht.id) : adminRoutes.fleet;
  const router = useRouter();
  const [form, setForm] = useState<YachtForm>(() =>
    template
      ? { ...template.form, name: `${template.form.name} (copy)`, featured: false }
      : (yacht?.form ?? INITIAL),
  );
  const [amenityOptions, setAmenityOptions] = useState(() => [
    ...DEFAULT_AMENITIES,
    ...(start?.form.amenities.filter((a) => !DEFAULT_AMENITIES.includes(a)) ?? []),
  ]);
  const [photos, setPhotos] = useState<Photo[]>(() =>
    (start?.photos ?? SAMPLE_PHOTOS).map((p, i) => ({ ...p, id: `photo-${i}` })),
  );
  const [dragId, setDragId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("details");
  const [draftState, setDraftState] = useState<"unsaved" | "saved" | "clean">(
    editing ? "clean" : "unsaved",
  );
  const [savedAt, setSavedAt] = useState("");
  const [problem, setProblem] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const set = <K extends keyof YachtForm>(key: K, value: YachtForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDraftState("unsaved");
  };
  const toggleIn = (key: "regions" | "amenities", value: string) =>
    set(
      key,
      form[key].includes(value) ? form[key].filter((v) => v !== value) : [...form[key], value],
    );

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

  // Free blob URLs for uploaded photos when leaving the page.
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(
    () => () => photosRef.current.forEach((p) => p.uploaded && URL.revokeObjectURL(p.src)),
    [],
  );

  /* Gallery */
  const onUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.currentTarget.files ?? []).filter((f) =>
      f.type.startsWith("image/"),
    );
    setPhotos((ps) => [
      ...ps,
      ...files.map((f, i) => ({
        id: `upload-${Date.now()}-${i}`,
        src: URL.createObjectURL(f),
        alt: f.name,
        uploaded: true,
      })),
    ]);
    setDraftState("unsaved");
    e.currentTarget.value = "";
  };
  const onDropFiles = (e: DragEvent<HTMLElement>) => {
    e.preventDefault();
    if (!e.dataTransfer.files.length) return;
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    setPhotos((ps) => [
      ...ps,
      ...files.map((f, i) => ({
        id: `drop-${Date.now()}-${i}`,
        src: URL.createObjectURL(f),
        alt: f.name,
        uploaded: true,
      })),
    ]);
  };
  const move = (fromId: string, toId: string) =>
    setPhotos((ps) => {
      const from = ps.findIndex((p) => p.id === fromId);
      const to = ps.findIndex((p) => p.id === toId);
      if (from < 0 || to < 0 || from === to) return ps;
      const next = [...ps];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item!);
      return next;
    });
  const makeCover = (id: string) => {
    const target = photos[0];
    if (target && target.id !== id) move(id, target.id);
    setDraftState("unsaved");
  };

  /* Ready to publish */
  const checks = [
    { label: "Yacht name", done: form.name.trim() !== "", field: "yacht-name" },
    { label: "At least one region", done: form.regions.length > 0, field: "details" },
    { label: "Maximum guests", done: Number(form.guests) > 0, field: "guests" },
    { label: "Card tagline", done: form.tagline.trim() !== "", field: "tagline" },
    { label: "3+ photos with a cover", done: photos.length >= 3, field: "gallery" },
    { label: "Day rate", done: Number(form.rate) > 0, field: "rate" },
  ];
  const doneCount = checks.filter((c) => c.done).length;

  function publish() {
    const missing = checks.filter((c) => !c.done);
    if (missing.length) {
      setProblem(
        `Finish ${missing.length} ${missing.length === 1 ? "item" : "items"} before publishing: ${missing.map((m) => m.label.toLowerCase()).join(", ")}.`,
      );
      const el = document.getElementById(missing[0]!.field);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)
        el.focus({ preventScroll: true });
      return;
    }
    // TODO: POST the yacht and photos to the fleet API.
    router.push(doneHref);
  }
  function saveDraft() {
    // TODO: save the draft through the fleet API.
    setDraftState("saved");
    setSavedAt(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
    setProblem("");
  }

  const rate = Number(form.rate);
  const cover = photos[0];

  return (
    <div>
      <div className="px-[20px] pt-[20px] pb-[40px] lg:pt-[33px] lg:pr-[47px] lg:pl-[46px]">
        <p className="text-[10px] tracking-[0.12em] uppercase" style={{ color: MUTED }}>
          Sithara Marina / Admin
        </p>
        <h1 className="mt-[18px] text-[30px] leading-[1.15] font-normal tracking-[-0.8px] lg:mt-[24px] lg:text-[43px] lg:tracking-[-1.3px]">
          {editing ? `${yacht!.form.name},` : "A new vessel,"}{" "}
          <em
            className="tracking-[-0.5px]"
            style={{ fontFamily: "'Instrument Serif', Georgia, serif" }}
          >
            in detail.
          </em>
        </h1>
        <p className="mt-[10px] flex items-center gap-[6px] text-[12px]" style={{ color: BODY }}>
          {editing ? "Edit yacht" : "Add yacht"}
          <span aria-hidden="true">·</span>
          <span
            role="status"
            className="border border-[#dcdad5] px-[7px] py-[2px] text-[11px]"
            style={{ backgroundColor: SAND }}
          >
            {draftState === "saved"
              ? `Draft saved ${savedAt}`
              : draftState === "clean"
                ? "All changes saved"
                : editing
                  ? "Unsaved changes"
                  : "Unsaved draft"}
          </span>
        </p>

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
          onSubmit={(e) => {
            e.preventDefault();
            publish();
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
                    value={form.name}
                    onChange={(e) => set("name", e.currentTarget.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="vessel-type">Vessel type</Label>
                  <SelectBox
                    id="vessel-type"
                    value={form.type}
                    onChange={(v) => set("type", v)}
                    options={VESSEL_TYPES}
                  />
                </div>
                <div>
                  <Label htmlFor="home-port">Home port</Label>
                  <input
                    id="home-port"
                    className={input}
                    placeholder="e.g. Kochi Marina"
                    value={form.port}
                    onChange={(e) => set("port", e.currentTarget.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="registration">Registration no.</Label>
                  <input
                    id="registration"
                    className={input}
                    placeholder="Shown to staff only"
                    value={form.registration}
                    onChange={(e) => set("registration", e.currentTarget.value)}
                  />
                </div>
              </div>
              <div className="mt-[24px]">
                <ChipGroup
                  label="Cruising regions"
                  required
                  hint="choose all that apply"
                  multiple
                  options={REGIONS.map((r) => ({ value: r, label: r }))}
                  selected={form.regions}
                  onToggle={(v) => toggleIn("regions", v)}
                />
              </div>
              <div className="mt-[24px]">
                <ChipGroup
                  label="Ownership"
                  required
                  options={[
                    { value: "owned", label: "Owned" },
                    { value: "partner", label: "Partner-owned" },
                  ]}
                  selected={[form.ownership]}
                  onToggle={(v) => set("ownership", v as YachtForm["ownership"])}
                />
              </div>
            </Section>

            {/* 02 Specs & story */}
            <Section id="specs" number="02" title="Specs & story">
              <div className="grid grid-cols-2 gap-x-[20px] gap-y-[22px] md:grid-cols-4">
                {(
                  [
                    ["length", "Length (metres)", "46", false],
                    ["guests", "Maximum guests", "12", true],
                    ["suites", "Suites", "6", false],
                    ["crew", "Crew", "9", false],
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
                      value={form[key]}
                      onChange={(e) => set(key, e.currentTarget.value.replace(/[^\d.]/g, ""))}
                    />
                  </div>
                ))}
                <div>
                  <Label htmlFor="built">Built / refit</Label>
                  <input
                    id="built"
                    className={input}
                    placeholder="2019 / 2024"
                    value={form.built}
                    onChange={(e) => set("built", e.currentTarget.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="speed">Cruising speed (kn)</Label>
                  <input
                    id="speed"
                    inputMode="numeric"
                    className={input}
                    placeholder="12"
                    value={form.speed}
                    onChange={(e) => set("speed", e.currentTarget.value.replace(/[^\d.]/g, ""))}
                  />
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
                  onChange={(e) => set("tagline", e.currentTarget.value)}
                />
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
                  className={cx(input, "h-auto min-h-[156px] resize-y py-[14px] leading-[22px]")}
                  placeholder="A world of your own, with the horizon as its only boundary…"
                  value={form.description}
                  onChange={(e) => set("description", e.currentTarget.value)}
                />
              </div>

              <div className="mt-[24px]">
                <ChipGroup
                  label="Amenities"
                  multiple
                  options={amenityOptions.map((a) => ({ value: a, label: a }))}
                  selected={form.amenities}
                  onToggle={(v) => toggleIn("amenities", v)}
                  after={
                    <button
                      type="button"
                      onClick={() => {
                        const name = window.prompt("New amenity")?.trim();
                        if (!name) return;
                        if (!amenityOptions.includes(name)) setAmenityOptions((a) => [...a, name]);
                        if (!form.amenities.includes(name))
                          set("amenities", [...form.amenities, name]);
                      }}
                      className={cx(
                        chip,
                        "flex items-center gap-[4px] border-[#dcdad5] bg-white hover:border-[#0d1b2a]",
                      )}
                    >
                      <Plus aria-hidden="true" strokeWidth={1.5} className="size-[13px]" />
                      Add amenity
                    </button>
                  }
                />
              </div>
            </Section>

            {/* 03 Gallery */}
            <Section id="gallery" number="03" title="Gallery">
              <p className="-mt-[12px] text-[12px] leading-[18px]" style={{ color: BODY }}>
                Drag to reorder; choose the image used in yacht search. At least 3 photos,
                landscape, 2400px wide or more.
              </p>
              <ul className="mt-[18px] grid grid-cols-1 gap-[16px] sm:grid-cols-2 md:grid-cols-3">
                {photos.map((p, i) => (
                  <li
                    key={p.id}
                    draggable
                    onDragStart={() => setDragId(p.id)}
                    onDragEnd={() => setDragId(null)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragId) move(dragId, p.id);
                      else onDropFiles(e);
                    }}
                    className={cx(
                      "border bg-white transition-opacity",
                      i === 0 ? "border-[#0d1b2a] border-2" : "border-[#eceae6]",
                      dragId === p.id && "opacity-50",
                    )}
                  >
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element -- local previews, including blob URLs from uploads */}
                      <img
                        src={p.src}
                        alt={p.alt}
                        draggable={false}
                        className="aspect-[4/3] w-full object-cover"
                      />
                      {i === 0 && (
                        <span className="absolute top-[8px] left-[8px] bg-[#0d1b2a] px-[8px] py-[3px] text-[9px] tracking-[0.12em] text-white uppercase">
                          Cover
                        </span>
                      )}
                    </div>
                    <div className="flex h-[38px] items-center justify-between px-[10px]">
                      <span className="flex items-center gap-[2px]">
                        <GripVertical
                          aria-hidden="true"
                          strokeWidth={1.5}
                          className="size-[14px] cursor-grab text-[#b5b8bc]"
                        />
                        <span className="sr-only">
                          Photo {i + 1} of {photos.length}
                        </span>
                        {i > 0 && (
                          <button
                            type="button"
                            onClick={() => move(p.id, photos[i - 1]!.id)}
                            className="ml-1 px-1 text-[11px] text-[#8a8d91] hover:text-[#0d1b2a]"
                            aria-label={`Move photo ${i + 1} earlier`}
                          >
                            ←
                          </button>
                        )}
                      </span>
                      {i === 0 ? (
                        <span className="text-[11px] underline underline-offset-2">
                          Search image
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => makeCover(p.id)}
                          className="text-[11px] underline underline-offset-2 hover:opacity-70"
                        >
                          Use in search
                        </button>
                      )}
                    </div>
                  </li>
                ))}
                <li>
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={onDropFiles}
                    className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-[4px] border border-[#dcdad5] text-center transition-colors hover:border-[#0d1b2a]"
                    style={{ backgroundColor: "#f5f3ee" }}
                  >
                    <Upload aria-hidden="true" strokeWidth={1.5} className="mb-[6px] size-[16px]" />
                    <span className="text-[13px]">Upload photos</span>
                    <span className="text-[11px]" style={{ color: MUTED }}>
                      or drop files here
                    </span>
                  </button>
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={onUpload}
                  />
                </li>
              </ul>
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
                  <Label htmlFor="rate" required>
                    Day rate (₹)
                  </Label>
                  <input
                    id="rate"
                    inputMode="numeric"
                    className={input}
                    placeholder="450000"
                    value={form.rate}
                    onChange={(e) => set("rate", e.currentTarget.value.replace(/\D/g, ""))}
                  />
                </div>
                <div>
                  <Label htmlFor="min-days">Minimum days</Label>
                  <input
                    id="min-days"
                    inputMode="numeric"
                    className={input}
                    placeholder="1"
                    value={form.minDays}
                    onChange={(e) => set("minDays", e.currentTarget.value.replace(/\D/g, ""))}
                  />
                </div>
                <div>
                  <Label htmlFor="deposit">Deposit (%)</Label>
                  <input
                    id="deposit"
                    inputMode="numeric"
                    className={input}
                    placeholder="30"
                    value={form.deposit}
                    onChange={(e) =>
                      set("deposit", e.currentTarget.value.replace(/\D/g, "").slice(0, 3))
                    }
                  />
                </div>
                {(
                  [
                    ["embark", "Embark time"],
                    ["disembark", "Disembark time"],
                  ] as const
                ).map(([key, label]) => (
                  <div key={key}>
                    <Label htmlFor={key}>{label}</Label>
                    <div className="relative">
                      <input
                        id={key}
                        type="time"
                        className={cx(
                          input,
                          "pr-10 [&::-webkit-calendar-picker-indicator]:opacity-0",
                        )}
                        value={form[key]}
                        onChange={(e) => set(key, e.currentTarget.value)}
                      />
                      <Clock
                        aria-hidden="true"
                        strokeWidth={1.75}
                        className="pointer-events-none absolute top-1/2 right-[16px] size-[15px] -translate-y-1/2"
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-[22px] text-[12px]" style={{ color: BODY }} aria-live="polite">
                {rate > 0
                  ? `Guests will see: from ₹ ${rate.toLocaleString("en-IN")} per day${form.deposit ? ` · ${form.deposit}% deposit to confirm` : ""}.`
                  : "Set a day rate to preview what guests will see."}
              </p>
            </Section>

            {/* 05 Publishing */}
            <Section id="publishing" number="05" title="Publishing">
              <Toggle
                id="visible"
                label="Visible on website"
                text="Appears in yacht search and the collection."
                checked={form.visible}
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
                  value={form.status}
                  onChange={(v) => set("status", v)}
                  options={STATUSES}
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
                  <img src={cover.src} alt="" className="aspect-[264/156] w-full object-cover" />
                ) : (
                  <div className="aspect-[264/156] w-full bg-[#eceae6]" />
                )}
                {form.regions[0] && (
                  <span className="absolute top-[8px] left-[8px] bg-white px-[7px] py-[2px] text-[11px]">
                    {form.regions[0]}
                  </span>
                )}
              </div>
              <p
                className={cx(
                  "mt-[16px] text-[26px] leading-[32px] tracking-[-0.5px]",
                  !form.name && "text-[#b8bbbf]",
                )}
              >
                {form.name || "Yacht name"}
              </p>
              <p className="mt-[4px] text-[11px]" style={{ color: MUTED }}>
                {form.length || "—"} metres | {form.guests || "—"} guests | {form.suites || "—"}{" "}
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
                        "flex size-[18px] items-center justify-center rounded-full border",
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
            {problem && (
              <p role="alert" className="mb-[12px] text-[12px] text-[#9b2c2c]">
                {problem}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-[16px]">
              <button
                type="submit"
                className="flex h-[52px] w-[176px] items-center justify-center text-[12px] transition-opacity hover:opacity-90"
                style={{ background: GRADIENT }}
              >
                {editing ? "Save changes" : "Publish yacht"}
              </button>
              <button
                type="button"
                onClick={saveDraft}
                className="flex h-[52px] w-[166px] items-center justify-center border bg-white text-[12px] transition-colors hover:bg-[#f2f1ee]"
                style={{ borderColor: INK }}
              >
                Save as draft
              </button>
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
