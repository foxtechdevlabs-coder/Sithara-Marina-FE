"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";

import { BODY, MUTED, SAND } from "@/components/admin/admin-theme";
import {
  errorProps,
  FieldError,
  input,
  Label,
  LoadState,
  Notice,
  OUTLINE_STYLE,
  PRIMARY_STYLE,
} from "@/components/admin/form-parts";
import { adminRoutes } from "@/constants/routes";
import {
  InfoPanel,
  PageHeader,
  pagePadding,
  smallOutline,
  smallPrimary,
} from "@/features/admin/bookings/components/booking-ui";
import { formatInstant } from "@/features/admin/bookings/utils/booking-format";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { useDebounced } from "@/features/admin/fleet/hooks/use-debounced";
import { cx } from "@/lib/cx";
import {
  getTemplate,
  previewTemplate,
  resetTemplate,
  saveTemplate,
  templateProblems,
  type Template,
  type TemplateText,
} from "@/services/admin/notifications.service";
import { isApiError } from "@/services/http/api-error";

import { notificationErrorMessage } from "../utils/notification-format";

type Field = keyof TemplateText;

/** Edit one email: subject, heading and text, with a live preview (PATCH / preview / DELETE …/notification-templates/{key}). */
export function TemplateEditor({ templateKey }: { templateKey: string }) {
  const template = useAdminQuery(
    (signal) => getTemplate(templateKey, signal),
    `template:${templateKey}`,
  );
  if (!template.data)
    return (
      <div className={pagePadding}>
        <PageHeader title="Words that reach the guest." />
        <div className="mt-[24px]">
          <LoadState
            loading={template.loading}
            error={
              template.error
                ? `Couldn't load the template. ${notificationErrorMessage(template.error)}`
                : undefined
            }
            onRetry={template.reload}
            label="Loading template"
          />
        </div>
      </div>
    );
  return <Editor key={template.data.key} template={template.data} onSaved={template.setData} />;
}

function Editor({ template: t, onSaved }: { template: Template; onSaved: (t: Template) => void }) {
  const [text, setText] = useState<TemplateText>({
    subject: t.subject,
    heading: t.heading,
    body: t.body,
  });
  const [busy, setBusy] = useState<"" | "save" | "reset">("");
  const [problems, setProblems] = useState<string[]>([]);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string }>();
  const [confirmReset, setConfirmReset] = useState(false);
  const [focused, setFocused] = useState<Field>("body");

  // A live preview of the current text, a moment after typing stops.
  const draftKey = useDebounced(JSON.stringify(text), 600);
  const preview = useAdminQuery(
    (signal) => previewTemplate(t.key, JSON.parse(draftKey) as TemplateText, signal),
    `template-preview:${t.key}:${draftKey}`,
  );
  const previewProblems = isApiError(preview.error) ? templateProblems(preview.error.body) : [];

  const changed: Partial<TemplateText> = {};
  (["subject", "heading", "body"] as Field[]).forEach((k) => {
    if (text[k] !== t[k]) changed[k] = text[k];
  });
  const dirty = Object.keys(changed).length > 0;
  const errors: Partial<Record<Field, string>> = {};
  if (!text.subject.trim()) errors.subject = "Enter a subject.";
  else if (/\n/.test(text.subject)) errors.subject = "Keep the subject on one line.";
  if (!text.heading.trim()) errors.heading = "Enter a heading.";
  if (!text.body.trim()) errors.body = "Enter the email text.";

  /** Puts {{ name }} where the cursor was in the field last used. */
  function insert(name: string) {
    const field = focused;
    const el = document.getElementById(`tpl-${field}`) as
      HTMLInputElement | HTMLTextAreaElement | null;
    const token = `{{ ${name} }}`;
    const value = text[field];
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    setText((x) => ({ ...x, [field]: value.slice(0, start) + token + value.slice(end) }));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length, start + token.length);
    });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setNotice(undefined);
    setProblems([]);
    if (Object.keys(errors).length || !dirty) {
      if (!dirty) setNotice({ tone: "success", text: "Nothing to save: the text is unchanged." });
      return;
    }
    setBusy("save");
    try {
      const saved = await saveTemplate(t.key, changed);
      onSaved(saved);
      setNotice({ tone: "success", text: "Saved. New emails use this text straight away." });
    } catch (err) {
      setProblems(isApiError(err) ? templateProblems(err.body) : []);
      setNotice({ tone: "error", text: notificationErrorMessage(err) });
    } finally {
      setBusy("");
    }
  }

  async function reset() {
    setBusy("reset");
    setNotice(undefined);
    try {
      const saved = await resetTemplate(t.key);
      onSaved(saved);
      setText({ subject: saved.subject, heading: saved.heading, body: saved.body });
      setConfirmReset(false);
      setNotice({ tone: "success", text: "Back to the default text." });
    } catch (err) {
      setNotice({ tone: "error", text: notificationErrorMessage(err) });
    } finally {
      setBusy("");
    }
  }

  const fieldProps = (k: Field) => ({
    onFocus: () => setFocused(k),
    value: text[k],
    onChange: (e: { currentTarget: { value: string } }) => {
      const value = e.currentTarget.value;
      setText((x) => ({ ...x, [k]: value }));
    },
  });

  return (
    <div className={pagePadding}>
      <PageHeader
        title="Words that reach the guest."
        subtitle={`${t.name} · ${t.audience === "staff" ? "to the team" : "to customers"}`}
      />
      <p className="mt-[10px] max-w-[760px] text-[12px] leading-[18px]" style={{ color: BODY }}>
        {t.description}{" "}
        <span style={{ color: MUTED }}>
          {t.is_customised
            ? `Customised${t.updated_at ? ` · edited ${formatInstant(t.updated_at)}` : ""}`
            : "Using the default text"}
        </span>
      </p>

      <div className="mt-[24px] grid gap-[28px] xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <form onSubmit={save} noValidate aria-label="Email text">
          <div>
            <Label htmlFor="tpl-subject" required>
              Subject
            </Label>
            <input
              id="tpl-subject"
              maxLength={200}
              className={input}
              {...fieldProps("subject")}
              {...errorProps("tpl-subject", errors.subject)}
            />
            <FieldError id="tpl-subject" message={errors.subject} />
          </div>
          <div className="mt-[18px]">
            <Label htmlFor="tpl-heading" required hint="the email’s title">
              Heading
            </Label>
            <input
              id="tpl-heading"
              maxLength={200}
              className={input}
              {...fieldProps("heading")}
              {...errorProps("tpl-heading", errors.heading)}
            />
            <FieldError id="tpl-heading" message={errors.heading} />
          </div>
          <div className="mt-[18px]">
            <Label htmlFor="tpl-body" required hint="a blank line starts a new paragraph">
              Text
            </Label>
            <textarea
              id="tpl-body"
              rows={12}
              maxLength={5000}
              className={cx(input, "h-auto py-[12px] leading-[20px]")}
              {...fieldProps("body")}
              {...errorProps("tpl-body", errors.body)}
            />
            <FieldError id="tpl-body" message={errors.body} />
            <p className="mt-[4px] text-right text-[10px]" style={{ color: MUTED }}>
              {text.body.length.toLocaleString("en-IN")} / 5,000
            </p>
          </div>

          <div className="mt-[14px]">
            <p className="text-[11px]" style={{ color: BODY }}>
              Placeholders — click to add at the cursor
            </p>
            <ul className="mt-[8px] flex flex-wrap gap-[6px]">
              {t.variables.map((v) => (
                <li key={v.name}>
                  <button
                    type="button"
                    onClick={() => insert(v.name)}
                    title={`${v.description}. Example: ${v.sample}`}
                    className="border border-[#dcdad5] bg-white px-[8px] py-[4px] text-[11px] hover:border-[#0d1b2a]"
                  >
                    {`{{ ${v.name} }}`}
                    {v.required && (
                      <span className="ml-[4px] text-[#b3261e]" aria-label="required">
                        *
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-[6px] text-[10px]" style={{ color: MUTED }}>
              * The text must keep these.
            </p>
          </div>

          {(problems.length > 0 || previewProblems.length > 0) && (
            <Notice tone="error" className="mt-[16px]">
              <span className="block">Fix before saving:</span>
              {/* The notice is a paragraph: one line per problem, not a list. */}
              {[...new Set([...problems, ...previewProblems])].map((p) => (
                <span key={p} className="mt-[2px] block pl-[10px]">
                  · {p}
                </span>
              ))}
            </Notice>
          )}
          {notice && (
            <Notice tone={notice.tone} className="mt-[16px]">
              {notice.text}
            </Notice>
          )}

          <div className="mt-[20px] flex flex-wrap gap-[14px]">
            <button
              type="submit"
              disabled={Boolean(busy)}
              className={cx(smallPrimary, "min-w-[140px]")}
              style={PRIMARY_STYLE}
            >
              {busy === "save" ? "Saving…" : "Save email"}
            </button>
            {t.is_customised && !confirmReset && (
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => setConfirmReset(true)}
                className={cx(smallOutline, "min-w-[140px]")}
                style={OUTLINE_STYLE}
              >
                Reset to default
              </button>
            )}
            <Link
              href={`${adminRoutes.notifications}?tab=templates`}
              className={cx(smallOutline, "min-w-[140px]")}
              style={OUTLINE_STYLE}
            >
              Back to templates
            </Link>
          </div>
          {confirmReset && (
            <div
              role="alertdialog"
              aria-labelledby="reset-title"
              className="mt-[16px] border border-[#dcdad5] bg-white px-[16px] py-[14px]"
            >
              <p id="reset-title" className="text-[14px]">
                Replace your text with the default?
              </p>
              <p className="mt-[4px] text-[12px]" style={{ color: BODY }}>
                Subject: {t.defaults.subject}
              </p>
              <div className="mt-[12px] flex flex-wrap gap-[10px]">
                <button
                  type="button"
                  disabled={Boolean(busy)}
                  onClick={() => void reset()}
                  className={smallPrimary}
                  style={PRIMARY_STYLE}
                >
                  {busy === "reset" ? "Resetting…" : "Use the default"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className={smallOutline}
                  style={OUTLINE_STYLE}
                >
                  Keep mine
                </button>
              </div>
            </div>
          )}
        </form>

        <section aria-labelledby="tpl-preview">
          <div className="flex items-baseline justify-between gap-[10px]">
            <h2 id="tpl-preview" className="text-[18px] leading-[24px]">
              Preview
            </h2>
            <span className="text-[10px]" style={{ color: MUTED }}>
              {preview.loading ? "Updating…" : dirty ? "Unsaved changes" : "As saved"}
            </span>
          </div>
          <p
            className="mt-[6px] px-[12px] py-[8px] text-[12px] break-words"
            style={{ backgroundColor: SAND }}
          >
            <span style={{ color: MUTED }}>Subject: </span>
            {preview.data?.subject ?? text.subject}
          </p>
          {preview.data ? (
            <iframe
              title="Email preview"
              sandbox=""
              srcDoc={preview.data.html}
              className={cx(
                "mt-[8px] h-[560px] w-full border border-[#e3e1dc] bg-white",
                preview.loading && "opacity-60",
              )}
            />
          ) : (
            <div
              className="mt-[8px] flex h-[200px] items-center justify-center border border-dashed border-[#d8d6d1] text-[12px]"
              style={{ color: MUTED }}
            >
              {preview.loading
                ? "Preparing preview…"
                : preview.error
                  ? "Fix the problems to see the preview."
                  : ""}
            </div>
          )}
          <InfoPanel title="Sample values" className="mt-[12px]">
            The preview fills placeholders with examples:{" "}
            {t.variables
              .slice(0, 4)
              .map((v) => `${v.name} = ${v.sample}`)
              .join(" · ")}
            {t.variables.length > 4 ? " …" : ""}
          </InfoPanel>
        </section>
      </div>
    </div>
  );
}
