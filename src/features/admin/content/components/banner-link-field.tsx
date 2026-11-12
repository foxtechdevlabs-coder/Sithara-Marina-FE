"use client";

import { useState } from "react";

import { MUTED } from "@/components/admin/admin-theme";
import { errorProps, FieldError, input, SelectBox } from "@/components/admin/form-parts";
import { searchYachts } from "@/components/admin/lookups";
import { SearchSelect, type SearchResult } from "@/components/admin/search-select";
import { userRoutes } from "@/constants/routes";
import type { Yacht } from "@/services/admin/fleet.service";

import { YACHT_LINK, YACHT_PLAN_LINK } from "../utils/content-format";

/* Where a banner leads: a page of the customer website, a yacht, or a typed path. */

/** Fixed pages of the customer website (src/app/(user)). */
const PAGES = [
  { value: userRoutes.home, label: "Home page" },
  { value: userRoutes.yachts, label: "All yachts" },
  { value: userRoutes.planCharter, label: "Plan your charter" },
  { value: userRoutes.search, label: "Search" },
] as const;

type Choice = "none" | "custom" | "yacht" | "yacht-plan" | (typeof PAGES)[number]["value"];

const CHOICES: { value: Choice; label: string }[] = [
  { value: "none", label: "No link" },
  ...PAGES.map((p) => ({ value: p.value, label: `${p.label} (${p.value})` })),
  { value: "yacht", label: "A yacht’s page (/yachts/…)" },
  { value: "yacht-plan", label: "Plan a charter for a yacht" },
  { value: "custom", label: "Custom path or URL…" },
];

/** What a saved link points at; anything unknown is a custom path. */
function parse(value: string): { choice: Choice; slug: string } {
  if (!value) return { choice: "none", slug: "" };
  const page = PAGES.find((p) => p.value === value);
  if (page) return { choice: page.value, slug: "" };
  if (value.startsWith(YACHT_LINK) && /^[^/?#]*$/.test(value.slice(YACHT_LINK.length)))
    return { choice: "yacht", slug: decodeURIComponent(value.slice(YACHT_LINK.length)) };
  if (value.startsWith(YACHT_PLAN_LINK) && /^[^&#]*$/.test(value.slice(YACHT_PLAN_LINK.length)))
    return { choice: "yacht-plan", slug: decodeURIComponent(value.slice(YACHT_PLAN_LINK.length)) };
  return { choice: "custom", slug: "" };
}

/** Yachts by name, with the slug as the value (the website's yacht URLs use the slug). */
const loadYachts = async (search: string, signal: AbortSignal): Promise<SearchResult<Yacht>> => {
  const result = await searchYachts()(search, signal);
  return { ...result, options: result.options.map((o) => ({ ...o, value: o.data!.slug })) };
};

/** The yacht behind a saved slug, for its name (the search matches slugs too). */
const resolveYachtSlug = async (slug: string, signal: AbortSignal) =>
  (await loadYachts(slug, signal)).options.find((o) => o.value === slug) ?? null;

export function BannerLinkField({
  id,
  value,
  onChange,
  error,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** Shown under whichever control is in use. */
  error?: string;
}) {
  const parsed = parse(value);
  // "Custom" stays chosen while typing, even when the text matches a listed page.
  const [custom, setCustom] = useState(parsed.choice === "custom");
  const [yachtName, setYachtName] = useState("");
  const choice: Choice = custom ? "custom" : parsed.choice;
  const forYacht = choice === "yacht" || choice === "yacht-plan";
  const prefix = choice === "yacht-plan" ? YACHT_PLAN_LINK : YACHT_LINK;
  // The error belongs to the control being filled in.
  const active = forYacht ? `${id}-yacht` : custom ? `${id}-custom` : id;

  function choose(next: Choice) {
    setCustom(next === "custom");
    if (next === "custom") return;
    if (next === "none") onChange("");
    else if (next === "yacht" || next === "yacht-plan")
      onChange((next === "yacht" ? YACHT_LINK : YACHT_PLAN_LINK) + encodeURIComponent(parsed.slug));
    else onChange(next);
  }

  return (
    <div className="space-y-[10px]">
      <SelectBox
        id={id}
        value={choice}
        onChange={(v) => choose(v as Choice)}
        options={CHOICES}
        invalid={active === id ? error : undefined}
      />
      {forYacht && (
        <SearchSelect<Yacht>
          id={`${id}-yacht`}
          value={parsed.slug}
          onChange={(slug, option) => {
            setYachtName(option?.label ?? "");
            onChange(prefix + (slug ? encodeURIComponent(slug) : ""));
          }}
          load={loadYachts}
          resolve={resolveYachtSlug}
          selectedLabel={yachtName || undefined}
          placeholder="Search yachts by name…"
          clearable
          invalid={error}
        />
      )}
      {custom && (
        <input
          id={`${id}-custom`}
          aria-label="Custom path or URL"
          value={value}
          maxLength={500}
          placeholder="/plan-your-charter or https://…"
          autoFocus
          onChange={(e) => onChange(e.currentTarget.value)}
          className={input}
          {...errorProps(active, error)}
        />
      )}
      <FieldError id={active} message={error} />
      {value && !error && !custom && !(forYacht && !parsed.slug) && (
        <p className="text-[11px]" style={{ color: MUTED }}>
          Opens {value}
        </p>
      )}
    </div>
  );
}
