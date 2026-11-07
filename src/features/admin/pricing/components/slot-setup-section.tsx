"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { useRef, useState } from "react";

import { BODY, MUTED } from "@/components/admin/admin-theme";
import {
  Label,
  Notice,
  OUTLINE_STYLE,
  PRIMARY_STYLE,
  Section,
  Toggle,
  input,
  outlineButton,
  primaryButton,
} from "@/components/admin/form-parts";
import { TimeInput } from "@/components/admin/time-input";
import { fleetErrorMessage } from "@/features/admin/fleet/utils/fleet-error-message";
import { cx } from "@/lib/cx";
import { formatTime } from "@/lib/time";
import { replaceSlotTypes, type SlotSetup } from "@/services/admin/fleet.service";

import {
  FIRST_START,
  LAST_RETURN,
  slotSetupProblem,
  toSlotSetupInput,
  type SlotSetupDraft,
  type SlotTypeDraft,
} from "../utils/pricing-form";

let draftKey = 0;
const newKey = () => `slot-${draftKey++}`;

const draftOf = (setup: SlotSetup): SlotSetupDraft => ({
  opensAt: setup.opens_at ?? "",
  closesAt: setup.closes_at ?? "",
  turnaround: String(setup.turnaround_minutes),
  slotTypes: [...setup.slot_types]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((t) => ({
      id: t.id,
      key: t.id,
      name: t.name,
      duration: String(t.duration_minutes),
      startTimes: t.start_times.map(formatTime).join(", "),
      active: t.is_active,
    })),
});

const blankType = (): SlotTypeDraft => ({
  id: "",
  key: newKey(),
  name: "",
  duration: "240",
  startTimes: "",
  active: true,
});

/**
 * Operating hours and slot types of one yacht. Saving replaces the whole
 * setup: PUT /admin/yachts/{id}/slot-types. Slot types removed here are
 * deleted on the server together with their price rules.
 */
export function SlotSetupSection({
  yachtId,
  setup,
  ruleCount,
  onSaved,
}: {
  yachtId: string;
  setup: SlotSetup;
  /** Price rules per slot type id, to warn before removing a slot type. */
  ruleCount: (slotTypeId: string) => number;
  onSaved: (setup: SlotSetup) => void;
}) {
  const [draft, setDraft] = useState(() => draftOf(setup));
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState("");
  const [notice, setNotice] = useState("");
  const busy = useRef(false);

  const change = (update: Partial<SlotSetupDraft>) => {
    setDraft((d) => ({ ...d, ...update }));
    setNotice("");
  };
  const changeType = (key: string, update: Partial<SlotTypeDraft>) =>
    change({ slotTypes: draft.slotTypes.map((t) => (t.key === key ? { ...t, ...update } : t)) });
  const move = (index: number, by: -1 | 1) => {
    const next = [...draft.slotTypes];
    const [item] = next.splice(index, 1);
    next.splice(index + by, 0, item!);
    change({ slotTypes: next });
  };

  async function save() {
    if (busy.current) return;
    const found = slotSetupProblem(draft);
    if (found) {
      setProblem(found);
      return;
    }
    const removed = setup.slot_types.filter((t) => !draft.slotTypes.some((d) => d.id === t.id));
    const lostRules = removed.reduce((sum, t) => sum + ruleCount(t.id), 0);
    if (
      removed.length &&
      !window.confirm(
        `Remove ${removed.map((t) => `"${t.name}"`).join(", ")}?${lostRules ? ` ${lostRules} price ${lostRules === 1 ? "rule" : "rules"} will be deleted with ${removed.length === 1 ? "it" : "them"}.` : ""} Existing bookings keep their times.`,
      )
    )
      return;

    busy.current = true;
    setSaving(true);
    setProblem("");
    try {
      const saved = await replaceSlotTypes(yachtId, toSlotSetupInput(draft));
      setDraft(draftOf(saved));
      onSaved(saved);
      setNotice("Operating hours and slot types saved.");
    } catch (err) {
      setProblem(`Couldn't save the slot setup. ${fleetErrorMessage(err)}`);
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  return (
    <Section id="slots" number="01" title="Operating hours & slots">
      <form
        noValidate
        aria-busy={saving}
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="grid grid-cols-2 gap-x-[20px] gap-y-[22px] md:grid-cols-3">
          <div>
            <Label htmlFor="opens-at" required hint="first departure, from 5:00 AM">
              Opens
            </Label>
            <TimeInput
              id="opens-at"
              label="Opens"
              min={FIRST_START}
              max={LAST_RETURN}
              value={draft.opensAt}
              onChange={(opensAt) => change({ opensAt })}
            />
          </div>
          <div>
            <Label htmlFor="closes-at" required hint="last return, by 7:00 PM">
              Closes
            </Label>
            <TimeInput
              id="closes-at"
              label="Closes"
              min={FIRST_START}
              max={LAST_RETURN}
              value={draft.closesAt}
              onChange={(closesAt) => change({ closesAt })}
            />
          </div>
          <div className="col-span-2 md:col-span-1">
            <Label htmlFor="turnaround" required hint="minutes between charters">
              Turnaround
            </Label>
            <input
              id="turnaround"
              inputMode="numeric"
              className={input}
              maxLength={3}
              value={draft.turnaround}
              onChange={(e) => change({ turnaround: e.currentTarget.value.replace(/\D/g, "") })}
            />
          </div>
        </div>

        <h3 className="mt-[30px] text-[15px] leading-[22px]">Slot types</h3>
        <p className="mt-[4px] text-[12px] leading-[18px]" style={{ color: BODY }}>
          Each slot type is a charter length guests can book, with its start times. Listed in the
          order guests see them.
        </p>
        {draft.slotTypes.length === 0 && (
          <p className="mt-[14px] text-[13px]" style={{ color: BODY }}>
            No slot types yet. Add one so guests can book this yacht.
          </p>
        )}
        <ol className="mt-[14px] flex flex-col gap-[16px]">
          {draft.slotTypes.map((t, i) => (
            <li
              key={t.key}
              className="border border-[#eceae6] px-[16px] pt-[14px] pb-[6px]"
              aria-label={t.name || `Slot type ${i + 1}`}
            >
              <div className="flex items-center justify-between gap-[8px]">
                <p className="text-[11px] tracking-[0.12em] uppercase" style={{ color: MUTED }}>
                  {t.id ? `Slot type ${i + 1}` : `New slot type`}
                </p>
                <span className="flex items-center">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label={`Move ${t.name || `slot type ${i + 1}`} up`}
                    className="flex size-[28px] items-center justify-center hover:bg-[#f2f1ee] disabled:opacity-30"
                  >
                    <ArrowUp aria-hidden="true" strokeWidth={1.5} className="size-[14px]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === draft.slotTypes.length - 1}
                    aria-label={`Move ${t.name || `slot type ${i + 1}`} down`}
                    className="flex size-[28px] items-center justify-center hover:bg-[#f2f1ee] disabled:opacity-30"
                  >
                    <ArrowDown aria-hidden="true" strokeWidth={1.5} className="size-[14px]" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      change({ slotTypes: draft.slotTypes.filter((x) => x.key !== t.key) })
                    }
                    aria-label={`Remove ${t.name || `slot type ${i + 1}`}`}
                    className="flex size-[28px] items-center justify-center hover:bg-[#f2f1ee]"
                  >
                    <X aria-hidden="true" strokeWidth={1.75} className="size-[14px]" />
                  </button>
                </span>
              </div>
              <div className="mt-[10px] grid gap-x-[16px] gap-y-[14px] sm:grid-cols-[2fr_1fr_2fr]">
                <div>
                  <Label htmlFor={`${t.key}-name`} required>
                    Name
                  </Label>
                  <input
                    id={`${t.key}-name`}
                    className={input}
                    maxLength={50}
                    placeholder="e.g. 4-hour"
                    value={t.name}
                    onChange={(e) => changeType(t.key, { name: e.currentTarget.value })}
                  />
                </div>
                <div>
                  <Label htmlFor={`${t.key}-duration`} required hint="min">
                    Duration
                  </Label>
                  <input
                    id={`${t.key}-duration`}
                    inputMode="numeric"
                    className={input}
                    maxLength={4}
                    value={t.duration}
                    onChange={(e) =>
                      changeType(t.key, { duration: e.currentTarget.value.replace(/\D/g, "") })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor={`${t.key}-times`} required hint="comma-separated">
                    Start times
                  </Label>
                  <input
                    id={`${t.key}-times`}
                    className={input}
                    placeholder="9:00 AM, 2:00 PM"
                    value={t.startTimes}
                    onChange={(e) => changeType(t.key, { startTimes: e.currentTarget.value })}
                  />
                </div>
              </div>
              <div className="mt-[14px]">
                <Toggle
                  id={`${t.key}-active`}
                  label="Bookable"
                  text="Inactive slot types are kept with their prices but can't be booked."
                  checked={t.active}
                  onChange={(v) => changeType(t.key, { active: v })}
                />
              </div>
            </li>
          ))}
        </ol>
        {draft.slotTypes.length < 20 && (
          <button
            type="button"
            onClick={() => change({ slotTypes: [...draft.slotTypes, blankType()] })}
            className="mt-[16px] inline-flex items-center gap-[6px] text-[13px] underline underline-offset-2 hover:opacity-70"
          >
            <Plus aria-hidden="true" strokeWidth={1.5} className="size-[13px]" />
            Add slot type
          </button>
        )}

        {(problem || notice) && (
          <Notice tone={problem ? "error" : "success"} className="mt-[18px]">
            {problem || notice}
          </Notice>
        )}
        <div className="mt-[20px] flex flex-wrap gap-[12px]">
          <button
            type="submit"
            disabled={saving}
            className={cx(primaryButton, "min-w-[176px]")}
            style={PRIMARY_STYLE}
          >
            {saving ? "Saving…" : "Save hours & slots"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => {
              setDraft(draftOf(setup));
              setProblem("");
              setNotice("");
            }}
            className={outlineButton}
            style={OUTLINE_STYLE}
          >
            Discard changes
          </button>
        </div>
      </form>
    </Section>
  );
}
