"use client";

import { ArrowDown, ArrowUp, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import { BODY, INK, MUTED, SAND } from "@/components/admin/admin-theme";
import {
  Label,
  LoadState,
  Notice,
  OUTLINE_STYLE,
  PRIMARY_STYLE,
} from "@/components/admin/form-parts";
import { searchYachts } from "@/components/admin/lookups";
import { SearchSelect } from "@/components/admin/search-select";
import { adminRoutes } from "@/constants/routes";
import {
  Card,
  InfoPanel,
  smallOutline,
  smallPrimary,
} from "@/features/admin/bookings/components/booking-ui";
import { formatInstant } from "@/features/admin/bookings/utils/booking-format";
import { SpinViewer, type SpinSize } from "@/features/admin/fleet/components/spin-viewer";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { cx } from "@/lib/cx";
import {
  getSpinShowcase,
  updateSpinShowcase,
  type SpinShowcase,
} from "@/services/admin/content.service";
import { listYachts, type Yacht } from "@/services/admin/fleet.service";
import { getPublicYachtSpin, getYachtSpin } from "@/services/admin/yacht-spin.service";
import { isApiError } from "@/services/http/api-error";

import { contentErrorMessage } from "../utils/content-format";
import {
  entriesFromShowcase,
  entryFromYacht,
  moveEntry,
  savedStatus,
  showcaseChanged,
  showcaseErrorMessage,
  type ShowcaseEntry,
} from "../utils/spin-showcase";

/** The yachts the backend accepts in the carousel. */
const ELIGIBLE = { status: "active", visibility: "visible", has_spin: true } as const;

const iconButton =
  "flex size-[32px] items-center justify-center border border-[#dcdad5] bg-white transition-colors hover:bg-[#f2f1ee] disabled:cursor-not-allowed disabled:opacity-40";

/**
 * The home page's 360° carousel, on the Content page: which yachts it shows,
 * in what order. GET and PUT /admin/content/spin-showcase; yachts to add come
 * from GET /admin/yachts?has_spin=true (active and visible only).
 */
export function SpinShowcasePanel() {
  const showcase = useAdminQuery((signal) => getSpinShowcase(signal), "spin-showcase");
  const [justSaved, setJustSaved] = useState(false);

  if (!showcase.data) {
    return (
      <div className="mt-[20px]">
        <LoadState
          loading={showcase.loading}
          error={
            showcase.error
              ? `Couldn’t load the 360° carousel. ${contentErrorMessage(showcase.error)}`
              : undefined
          }
          onRetry={showcase.reload}
          label="Loading the 360° carousel"
        />
      </div>
    );
  }
  return (
    <ShowcaseEditor
      // A fresh save starts the editor again from what the backend now has.
      key={`${showcase.data.updated_at ?? "never"}:${showcase.data.items.map((i) => i.yacht.id).join()}`}
      showcase={showcase.data}
      refreshing={showcase.loading}
      savedNotice={justSaved}
      onSaved={(saved) => {
        setJustSaved(true);
        showcase.setData(saved);
        showcase.reload();
      }}
    />
  );
}

function ShowcaseEditor({
  showcase,
  refreshing,
  savedNotice,
  onSaved,
}: {
  showcase: SpinShowcase;
  refreshing: boolean;
  /** Just saved: say so, since saving starts the editor again. */
  savedNotice: boolean;
  onSaved: (saved: SpinShowcase) => void;
}) {
  const [entries, setEntries] = useState<ShowcaseEntry[]>(() => entriesFromShowcase(showcase));
  const [previewId, setPreviewId] = useState<string | null>(entries[0]?.id ?? null);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState("");
  const [notice, setNotice] = useState(
    savedNotice ? "Showcase saved. The home page carousel shows this list now." : "",
  );
  const busy = useRef(false);

  // Whether any yacht could be added at all, for the empty state.
  const eligible = useAdminQuery(
    (signal) => listYachts({ ...ELIGIBLE, limit: 1 }, signal),
    "spin-showcase-eligible",
  );

  const changed = showcaseChanged(entries, showcase);
  const full = entries.length >= showcase.max;
  const preview = entries.find((e) => e.id === previewId) ?? entries[0] ?? null;
  const listed = new Set(entries.map((e) => e.id));
  const search = searchYachts(ELIGIBLE);

  function edit(next: ShowcaseEntry[]) {
    setEntries(next);
    setNotice("");
    setProblem("");
  }

  function add(yacht: Yacht) {
    if (listed.has(yacht.id) || full) return;
    edit([...entries, entryFromYacht(yacht)]);
    setPreviewId(yacht.id);
  }

  async function save() {
    if (busy.current) return;
    if (!changed) {
      setNotice("No changes to save.");
      return;
    }
    if (entries.length > showcase.max) {
      setProblem(`The carousel takes at most ${showcase.max} yachts. Remove some, then save.`);
      return;
    }
    if (
      entries.length === 0 &&
      !window.confirm("Remove every yacht from the 360° carousel on the home page?")
    ) {
      return;
    }
    busy.current = true;
    setSaving(true);
    setProblem("");
    setNotice("");
    try {
      const saved = await updateSpinShowcase(entries.map((e) => e.id));
      onSaved(saved);
    } catch (err) {
      setProblem(showcaseErrorMessage(err, Object.fromEntries(entries.map((e) => [e.id, e.name]))));
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  async function loadFrames(entry: ShowcaseEntry, size: SpinSize): Promise<string[]> {
    try {
      return (await getPublicYachtSpin(entry.slug, size)).frames.map((f) => f.url);
    } catch (err) {
      // Not public (e.g. hidden since): the admin preview frames still show it.
      if (!isApiError(err) || err.status !== 404) throw err;
      return (await getYachtSpin(entry.id)).live?.preview_frames ?? [];
    }
  }

  // A name ending in "." ("Anjali K.") doesn't get a second full stop.
  const lastSaved = showcase.updated_at
    ? `Last saved ${formatInstant(showcase.updated_at)}${showcase.updated_by ? ` by ${showcase.updated_by.full_name}` : ""}`.replace(
        /\.*$/,
        ".",
      )
    : "Not saved yet.";

  return (
    <div className="mt-[20px] grid gap-[22px]">
      <InfoPanel title="Home page 360° carousel" className="lg:max-w-[880px]">
        The home page shows these yachts’ 360° views, in this order, up to {showcase.max}. Only
        active, visible yachts with a 360° view can be added. {lastSaved}
      </InfoPanel>

      <div className="grid gap-[22px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section aria-labelledby="showcase-list" className="min-w-0">
          <div className="flex flex-wrap items-baseline justify-between gap-[10px]">
            <h2 id="showcase-list" className="text-[20px] leading-[26px]">
              In the carousel
            </h2>
            <p className="text-[12px]" style={{ color: MUTED }} aria-live="polite">
              {entries.length} of {showcase.max}
              {changed ? " · Unsaved changes" : ""}
            </p>
          </div>

          {entries.length === 0 ? (
            <p
              className="mt-[12px] border border-[#e3e1dc] bg-white px-[16px] py-[14px] text-[13px]"
              style={{ color: BODY }}
            >
              No yachts in the carousel.
              {showcase.items.length > 0
                ? " Save to clear it from the home page, or discard the change."
                : " Add one below."}
            </p>
          ) : (
            <ol className={cx("mt-[12px] grid gap-[10px]", refreshing && "opacity-60")}>
              {entries.map((e, i) => {
                const isNew = !e.saved;
                const status = e.saved ? savedStatus(e.saved, showcase.max) : "New · not saved yet";
                const shown = e.saved?.shown_on_site ?? false;
                const previewing = preview?.id === e.id;
                return (
                  <li
                    key={e.id}
                    className={cx(
                      "flex items-center gap-[12px] border bg-white px-[12px] py-[10px]",
                      previewing ? "border-[#0d1b2a]" : "border-[#e3e1dc]",
                    )}
                  >
                    <span
                      className="w-[18px] shrink-0 text-center text-[12px]"
                      style={{ color: MUTED }}
                    >
                      {i + 1}
                    </span>
                    {e.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
                      <img
                        src={e.previewUrl}
                        alt=""
                        className="h-[44px] w-[66px] shrink-0 object-cover"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="flex h-[44px] w-[66px] shrink-0 items-center justify-center text-[11px]"
                        style={{ backgroundColor: SAND, color: MUTED }}
                      >
                        360°
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => setPreviewId(e.id)}
                        aria-pressed={previewing}
                        className="block max-w-full truncate text-left text-[14px] hover:underline"
                      >
                        {e.name}
                        <span className="sr-only"> — preview</span>
                      </button>
                      <p className="mt-[2px] text-[11px]" style={{ color: MUTED }}>
                        {e.partner ?? "Own yacht"} ·{" "}
                        <span
                          className="inline-block px-[6px] py-[1px] whitespace-nowrap"
                          style={{
                            backgroundColor: isNew ? "#dfe9f6" : shown ? "#e3efe6" : "#f6e7d8",
                            color: INK,
                          }}
                        >
                          {status}
                        </span>
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-[6px]">
                      <button
                        type="button"
                        className={iconButton}
                        disabled={i === 0 || saving}
                        onClick={() => edit(moveEntry(entries, i, -1))}
                        aria-label={`Move ${e.name} up`}
                      >
                        <ArrowUp aria-hidden="true" strokeWidth={1.5} className="size-[14px]" />
                      </button>
                      <button
                        type="button"
                        className={iconButton}
                        disabled={i === entries.length - 1 || saving}
                        onClick={() => edit(moveEntry(entries, i, 1))}
                        aria-label={`Move ${e.name} down`}
                      >
                        <ArrowDown aria-hidden="true" strokeWidth={1.5} className="size-[14px]" />
                      </button>
                      <button
                        type="button"
                        className={iconButton}
                        disabled={saving}
                        onClick={() => {
                          edit(entries.filter((x) => x.id !== e.id));
                          if (previewId === e.id) setPreviewId(null);
                        }}
                        aria-label={`Remove ${e.name}`}
                      >
                        <X aria-hidden="true" strokeWidth={1.5} className="size-[14px]" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          <div className="mt-[18px]">
            <Label htmlFor="showcase-add">Add a yacht</Label>
            {eligible.data && eligible.data.total === 0 ? (
              <p className="text-[12px] leading-[18px]" style={{ color: BODY }}>
                No yacht can be added yet: none is active, visible and has a 360° view. Add a 360°
                video on a yacht’s page under{" "}
                <Link href={adminRoutes.fleet} className="underline underline-offset-2">
                  Yachts
                </Link>
                .
              </p>
            ) : (
              <>
                <SearchSelect<Yacht>
                  id="showcase-add"
                  value=""
                  onChange={(_value, option) => option?.data && add(option.data)}
                  load={async (text, signal) => {
                    const result = await search(text, signal);
                    return {
                      ...result,
                      options: result.options.filter((o) => !listed.has(o.value)),
                    };
                  }}
                  loadKey={entries.map((e) => e.id).join()}
                  placeholder={
                    full
                      ? `The carousel is full (${showcase.max})`
                      : "Search yachts with a 360° view"
                  }
                  noResults="No other active, visible yacht with a 360° view matches."
                  disabled={full || saving}
                />
                {full && (
                  <p className="mt-[6px] text-[11px]" style={{ color: MUTED }}>
                    Remove a yacht to add another.
                  </p>
                )}
              </>
            )}
          </div>
        </section>

        <Card title="360° preview" className="min-w-0">
          {preview ? (
            <>
              <p className="mb-[12px]">
                {preview.name}
                {!preview.saved ? " · not saved yet" : ""}
              </p>
              <SpinViewer
                key={preview.id}
                viewKey={`showcase:${preview.id}`}
                label={`360° view of ${preview.name}`}
                loadFrames={(size) => loadFrames(preview, size)}
              />
            </>
          ) : (
            <p>Add a yacht, or choose one in the list, to preview its 360° view.</p>
          )}
        </Card>
      </div>

      {problem && (
        <Notice tone="error" className="lg:max-w-[880px]">
          {problem}
        </Notice>
      )}
      {notice && <Notice className="lg:max-w-[880px]">{notice}</Notice>}

      <div className="flex flex-wrap gap-[14px]">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className={cx(smallPrimary, "min-w-[160px]")}
          style={PRIMARY_STYLE}
        >
          {saving ? "Saving…" : "Save showcase"}
        </button>
        {changed && (
          <button
            type="button"
            onClick={() => {
              edit(entriesFromShowcase(showcase));
              setPreviewId(showcase.items[0]?.yacht.id ?? null);
            }}
            disabled={saving}
            className={cx(smallOutline, "min-w-[150px]")}
            style={OUTLINE_STYLE}
          >
            Discard changes
          </button>
        )}
      </div>
    </div>
  );
}
