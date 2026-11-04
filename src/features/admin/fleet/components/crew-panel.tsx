"use client";

import { Plus, X } from "lucide-react";
import { useRef, useState } from "react";

import { BODY, MUTED } from "@/components/admin/admin-theme";
import {
  FieldError,
  Label,
  Notice,
  OUTLINE_STYLE,
  PRIMARY_STYLE,
  errorProps,
  input,
  outlineButton,
  primaryButton,
} from "@/components/admin/form-parts";
import { cx } from "@/lib/cx";
import { replaceCrew, type CrewMember, type Yacht } from "@/services/admin/fleet.service";

import { fleetErrorMessage } from "../utils/fleet-error-message";

interface Row {
  key: string;
  name: string;
  role: string;
  bio: string;
}

const MAX_CREW = 50;
let rowKey = 0;
const toRow = (m?: CrewMember): Row => ({
  key: `crew-${rowKey++}`,
  name: m?.name ?? "",
  role: m?.role ?? "",
  bio: m?.bio ?? "",
});

/** Field errors keyed by `${row.key}-${field}`, following the backend rules. */
function validate(rows: Row[]) {
  const errors: Record<string, string> = {};
  for (const r of rows) {
    if (!r.name.trim()) errors[`${r.key}-name`] = "Enter a name.";
    else if (r.name.trim().length > 100) errors[`${r.key}-name`] = "Use 100 characters or fewer.";
    if (!r.role.trim()) errors[`${r.key}-role`] = "Enter a role, e.g. Captain.";
    else if (r.role.trim().length > 100) errors[`${r.key}-role`] = "Use 100 characters or fewer.";
    if (r.bio.length > 1000) errors[`${r.key}-bio`] = "Use 1,000 characters or fewer.";
  }
  return errors;
}

/**
 * The yacht's crew. Saving replaces the whole list: PUT /admin/yachts/{id}/crew
 * with `{ crew: [{ name, role, bio? }] }` (an empty list removes everyone).
 */
export function CrewPanel({
  yacht,
  onSaved,
}: {
  yacht: Pick<Yacht, "id" | "crew">;
  onSaved: (yacht: Yacht) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState("");
  const [notice, setNotice] = useState("");
  const busy = useRef(false);

  const edit = (key: string, field: "name" | "role" | "bio", value: string) => {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
    setErrors((e) => {
      const next = { ...e };
      delete next[`${key}-${field}`];
      return next;
    });
  };

  async function save() {
    if (busy.current) return;
    const found = validate(rows);
    setErrors(found);
    if (Object.keys(found).length) {
      setProblem("Check the highlighted crew details.");
      document.getElementById(Object.keys(found)[0]!)?.focus();
      return;
    }
    busy.current = true;
    setSaving(true);
    setProblem("");
    try {
      const crew = rows.map((r) => ({
        name: r.name.trim(),
        role: r.role.trim(),
        ...(r.bio.trim() ? { bio: r.bio.trim() } : {}),
      }));
      onSaved(await replaceCrew(yacht.id, crew));
      setEditing(false);
      setNotice("Crew saved.");
    } catch (err) {
      setProblem(`Couldn't save the crew. ${fleetErrorMessage(err)}`);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  return (
    <section
      aria-labelledby="crew-title"
      className="border border-[#e3e1dc] bg-white px-[20px] pt-[26px] pb-[28px] sm:px-[28px]"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-[12px]">
        <h2 id="crew-title" className="text-[20px] leading-[26px]">
          Crew
        </h2>
        {!editing && (
          <button
            type="button"
            onClick={() => {
              setRows(yacht.crew.map(toRow));
              setErrors({});
              setProblem("");
              setNotice("");
              setEditing(true);
            }}
            className="text-[13px] underline underline-offset-2 hover:opacity-70"
          >
            {yacht.crew.length ? "Edit crew" : "Add crew"}
          </button>
        )}
      </div>

      {notice && !editing && <Notice className="mt-[16px]">{notice}</Notice>}

      {!editing ? (
        yacht.crew.length ? (
          <ul className="mt-[18px] divide-y divide-[#eceae6] border-y border-[#eceae6]">
            {yacht.crew.map((m, i) => (
              <li key={`${i}-${m.name}`} className="py-[12px]">
                <p className="text-[14px]">
                  {m.name}{" "}
                  <span className="text-[12px]" style={{ color: MUTED }}>
                    · {m.role}
                  </span>
                </p>
                {m.bio && (
                  <p className="mt-[4px] text-[12px] leading-[18px]" style={{ color: BODY }}>
                    {m.bio}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-[18px] text-[14px]" style={{ color: BODY }}>
            No crew listed yet.
          </p>
        )
      ) : (
        <form
          noValidate
          aria-busy={saving}
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
          className="mt-[18px]"
        >
          {rows.length === 0 && (
            <p className="text-[13px]" style={{ color: BODY }}>
              No crew. Saving now removes everyone from this yacht&rsquo;s crew list.
            </p>
          )}
          <ol className="flex flex-col gap-[18px]">
            {rows.map((r, i) => (
              <li key={r.key} className="border border-[#eceae6] px-[16px] pt-[14px] pb-[16px]">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] tracking-[0.12em] uppercase" style={{ color: MUTED }}>
                    Crew member {i + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                    aria-label={`Remove crew member ${i + 1}`}
                    className="flex size-[28px] items-center justify-center hover:bg-[#f2f1ee]"
                  >
                    <X aria-hidden="true" strokeWidth={1.75} className="size-[14px]" />
                  </button>
                </div>
                <div className="mt-[10px] grid gap-x-[16px] gap-y-[14px] sm:grid-cols-2">
                  {(["name", "role"] as const).map((field) => {
                    const id = `${r.key}-${field}`;
                    return (
                      <div key={field}>
                        <Label htmlFor={id} required>
                          {field === "name" ? "Name" : "Role"}
                        </Label>
                        <input
                          id={id}
                          className={input}
                          maxLength={100}
                          placeholder={field === "name" ? "e.g. Arun Nair" : "e.g. Captain"}
                          value={r[field]}
                          onChange={(e) => edit(r.key, field, e.currentTarget.value)}
                          {...errorProps(id, errors[id])}
                        />
                        <FieldError id={id} message={errors[id]} />
                      </div>
                    );
                  })}
                  <div className="sm:col-span-2">
                    <Label htmlFor={`${r.key}-bio`} hint="optional">
                      Bio
                    </Label>
                    <textarea
                      id={`${r.key}-bio`}
                      rows={2}
                      maxLength={1000}
                      className={cx(input, "h-auto min-h-[76px] resize-y py-[12px] leading-[20px]")}
                      value={r.bio}
                      onChange={(e) => edit(r.key, "bio", e.currentTarget.value)}
                      {...errorProps(`${r.key}-bio`, errors[`${r.key}-bio`])}
                    />
                    <FieldError id={`${r.key}-bio`} message={errors[`${r.key}-bio`]} />
                  </div>
                </div>
              </li>
            ))}
          </ol>
          {rows.length < MAX_CREW && (
            <button
              type="button"
              onClick={() => setRows((rs) => [...rs, toRow()])}
              className="mt-[16px] inline-flex items-center gap-[6px] text-[13px] underline underline-offset-2 hover:opacity-70"
            >
              <Plus aria-hidden="true" strokeWidth={1.5} className="size-[13px]" />
              Add crew member
            </button>
          )}
          {problem && (
            <Notice tone="error" className="mt-[16px]">
              {problem}
            </Notice>
          )}
          <div className="mt-[18px] flex flex-wrap gap-[12px]">
            <button type="submit" disabled={saving} className={primaryButton} style={PRIMARY_STYLE}>
              {saving ? "Saving…" : "Save crew"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setEditing(false)}
              className={outlineButton}
              style={OUTLINE_STYLE}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
