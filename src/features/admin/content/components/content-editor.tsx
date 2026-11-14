"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

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
  SelectBox,
  Toggle,
} from "@/components/admin/form-parts";
import { adminRoutes } from "@/constants/routes";
import {
  InfoPanel,
  PageHeader,
  pagePadding,
  smallOutline,
  smallPrimary,
} from "@/features/admin/bookings/components/booking-ui";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { cx } from "@/lib/cx";
import {
  CONTENT_KINDS,
  createContent,
  deleteContent,
  findContent,
  updateContent,
  type Banner,
  type BannerInput,
  type ContentKind,
  type ContentPage,
  type Faq,
  type FaqInput,
  type PageInput,
} from "@/services/admin/content.service";
import { uploadBannerImage, yachtPhotoProblem } from "@/services/admin/media.service";

import {
  contentErrorMessage,
  isLink,
  isSlug,
  KIND_LABEL,
  needsYacht,
  slugify,
} from "../utils/content-format";
import { BannerLinkField } from "./banner-link-field";

const textarea = cx(input, "h-auto py-[12px] leading-[20px]");

interface Draft {
  title: string;
  body: string;
  /** Banner: link_url ("Primary action"). */
  action: string;
  slug: string;
  summary: string;
  category: string;
  showOnHome: boolean;
  order: string;
  published: boolean;
  mediaId: string | null;
  imageUrl: string | null;
}

const empty: Draft = {
  title: "",
  body: "",
  action: "",
  slug: "",
  summary: "",
  category: "",
  showOnHome: false,
  order: "0",
  published: false,
  mediaId: null,
  imageUrl: null,
};

function draftFrom(kind: ContentKind, item: Banner | ContentPage | Faq | null): Draft {
  if (!item) return empty;
  if (kind === "banners") {
    const b = item as Banner;
    return {
      ...empty,
      title: b.title,
      body: b.subtitle ?? "",
      action: b.link_url ?? "",
      order: String(b.sort_order),
      published: b.is_published,
      mediaId: b.media_id,
      imageUrl: b.image_url,
    };
  }
  if (kind === "pages") {
    const p = item as ContentPage;
    return {
      ...empty,
      title: p.title,
      body: p.body,
      slug: p.slug,
      summary: p.summary ?? "",
      showOnHome: p.show_on_home,
      order: String(p.sort_order),
      published: p.is_published,
    };
  }
  const f = item as Faq;
  return {
    ...empty,
    title: f.question,
    body: f.answer,
    category: f.category ?? "",
    order: String(f.sort_order),
    published: f.is_published,
  };
}

/** The request body for this kind. */
function toInput(kind: ContentKind, d: Draft): BannerInput | PageInput | FaqInput {
  const order = Number(d.order) || 0;
  if (kind === "banners")
    return {
      title: d.title.trim(),
      subtitle: d.body.trim() || null,
      link_url: d.action.trim() || null,
      media_id: d.mediaId,
      is_published: d.published,
      sort_order: order,
    };
  if (kind === "pages")
    return {
      title: d.title.trim(),
      slug: d.slug.trim(),
      summary: d.summary.trim() || null,
      body: d.body,
      show_on_home: d.showOnHome,
      is_published: d.published,
      sort_order: order,
    };
  return {
    question: d.title.trim(),
    answer: d.body.trim(),
    category: d.category.trim() || null,
    is_published: d.published,
    sort_order: order,
  };
}

/** Edit an existing item (found in its list) or start a new one. */
export function ContentEditor({ kind, itemId }: { kind: ContentKind; itemId?: string }) {
  const item = useAdminQuery(
    (signal) => (itemId ? findContent(kind, itemId, signal) : Promise.resolve(null)),
    `content-item:${kind}:${itemId ?? "new"}`,
  );
  if (itemId && item.data === undefined)
    return (
      <div className={pagePadding}>
        <PageHeader title="Words and images, considered." />
        <div className="mt-[24px]">
          <LoadState
            loading={item.loading}
            error={item.error ? `Couldn't load it. ${contentErrorMessage(item.error)}` : undefined}
            onRetry={item.reload}
            label="Loading content"
          />
        </div>
      </div>
    );
  if (itemId && item.data === null)
    return (
      <div className={pagePadding}>
        <PageHeader title="Words and images, considered." />
        <p className="mt-[24px] text-[14px]" style={{ color: BODY }}>
          This item no longer exists.{" "}
          <Link href={adminRoutes.contentKind(kind)} className="underline underline-offset-2">
            Back to content
          </Link>
        </p>
      </div>
    );
  return <Editor key={`${kind}:${itemId ?? "new"}`} kind={kind} item={item.data ?? null} />;
}

function Editor({
  kind: initialKind,
  item,
}: {
  kind: ContentKind;
  item: Banner | ContentPage | Faq | null;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<ContentKind>(initialKind);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(initialKind, item));
  const [slugTouched, setSlugTouched] = useState(Boolean(item));
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState<"" | "save" | "preview" | "delete">("");
  const [upload, setUpload] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string }>();
  const fileInput = useRef<HTMLInputElement>(null);
  const preview = useRef<string | null>(null);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));

  // Free a local image preview when it's replaced or the page closes.
  useEffect(() => () => void (preview.current && URL.revokeObjectURL(preview.current)), []);

  // Once a new item is created, later saves update it (the address changes a moment later).
  const [createdId, setCreatedId] = useState<string | null>(null);
  const savedId = item?.id ?? createdId;
  const isNew = !savedId;
  const errors: Partial<Record<keyof Draft, string>> = {};
  if (submitted) {
    if (!draft.title.trim())
      errors.title = kind === "faqs" ? "Enter the question." : "Enter a title.";
    else if (draft.title.length > 200) errors.title = "Keep it to 200 characters.";
    if (kind === "faqs" && !draft.body.trim()) errors.body = "Enter the answer.";
    if (kind === "pages") {
      if (!isSlug(draft.slug))
        errors.slug = "Use lower-case letters, numbers and dashes, e.g. terms-and-conditions.";
      if (draft.published && !draft.body.trim()) errors.body = "A published page needs body text.";
    }
    if (kind === "banners") {
      if (needsYacht(draft.action)) errors.action = "Choose a yacht.";
      else if (draft.action.trim() && !isLink(draft.action.trim()))
        errors.action = "Use a site path like /plan-your-charter, or a full https:// address.";
      if (draft.published && !draft.mediaId) errors.mediaId = "A published banner needs an image.";
    }
    if (!/^-?\d{1,4}$/.test(draft.order)) errors.order = "Enter a whole number.";
  }
  const valid = () => {
    const d = draft;
    if (!d.title.trim() || d.title.length > 200 || !/^-?\d{1,4}$/.test(d.order)) return false;
    if (kind === "faqs" && !d.body.trim()) return false;
    if (kind === "pages" && (!isSlug(d.slug) || (d.published && !d.body.trim()))) return false;
    if (
      kind === "banners" &&
      (needsYacht(d.action) ||
        (d.action.trim() && !isLink(d.action.trim())) ||
        (d.published && !d.mediaId))
    )
      return false;
    return true;
  };

  async function pickImage(file: File | undefined) {
    if (!file) return;
    const problem = yachtPhotoProblem(file);
    if (problem) {
      setNotice({ tone: "error", text: problem });
      return;
    }
    setNotice(undefined);
    setUpload(0);
    try {
      const mediaId = await uploadBannerImage(file, setUpload);
      if (preview.current) URL.revokeObjectURL(preview.current);
      preview.current = URL.createObjectURL(file);
      setDraft((d) => ({ ...d, mediaId, imageUrl: preview.current }));
    } catch (err) {
      setNotice({
        tone: "error",
        text: `The image couldn’t be uploaded. ${contentErrorMessage(err)}`,
      });
    } finally {
      setUpload(null);
    }
  }

  /** Saves; returns the saved id, or null when it didn't save. */
  async function save(mode: "save" | "preview"): Promise<string | null> {
    setSubmitted(true);
    setNotice(undefined);
    if (!valid()) return null;
    setBusy(mode);
    try {
      const body = toInput(kind, draft);
      const saved = savedId
        ? await updateContent(kind, savedId, body)
        : await createContent(kind, body as never);
      if (!savedId) setCreatedId(saved.id);
      if (mode === "save") {
        setNotice({
          tone: "success",
          text: draft.published
            ? "Saved. The website shows this version."
            : "Draft saved. It isn’t on the website yet.",
        });
        // Point the address at the saved item without remounting (keeps this message).
        if (!savedId)
          window.history.replaceState(null, "", adminRoutes.contentItem(kind, saved.id));
      }
      return saved.id;
    } catch (err) {
      setNotice({ tone: "error", text: contentErrorMessage(err) });
      return null;
    } finally {
      setBusy("");
    }
  }

  async function remove() {
    if (!item) return;
    setBusy("delete");
    try {
      await deleteContent(kind, item.id);
      router.push(`${adminRoutes.contentKind(kind)}&notice=deleted` as Route);
    } catch (err) {
      setNotice({ tone: "error", text: contentErrorMessage(err) });
      setBusy("");
      setConfirmDelete(false);
    }
  }

  const labels = {
    title: kind === "faqs" ? "Question" : "Title",
    body: kind === "banners" ? "Body copy" : kind === "faqs" ? "Answer" : "Body",
  };
  const subject =
    draft.title.trim() ||
    (isNew ? `New ${KIND_LABEL[kind].one.toLowerCase()}` : KIND_LABEL[kind].one);

  return (
    <div className={pagePadding}>
      <PageHeader
        title="Words and images, considered."
        subtitle={`Content editor · ${KIND_LABEL[kind].one} · ${subject}`}
      />

      <form
        noValidate
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          void save("save");
        }}
        className="mt-[24px] lg:mt-[30px]"
      >
        <div className="grid gap-x-[18px] gap-y-[22px] lg:max-w-[700px] lg:grid-cols-2">
          <div>
            <Label htmlFor="content-title" required>
              {labels.title}
            </Label>
            <input
              id="content-title"
              value={draft.title}
              maxLength={200}
              onChange={(e) => {
                const title = e.currentTarget.value;
                setDraft((d) => ({
                  ...d,
                  title,
                  slug: kind === "pages" && !slugTouched ? slugify(title) : d.slug,
                }));
              }}
              className={input}
              {...errorProps("content-title", errors.title)}
            />
            <FieldError id="content-title" message={errors.title} />
          </div>
          <div>
            <Label htmlFor="content-type">Content type</Label>
            <SelectBox
              id="content-type"
              value={kind}
              disabled={!isNew}
              onChange={(v) => {
                setKind(v as ContentKind);
                setSubmitted(false);
              }}
              options={CONTENT_KINDS.map((k) => ({ value: k, label: KIND_LABEL[k].one }))}
            />
          </div>

          {kind === "pages" && (
            <>
              <div>
                <Label htmlFor="content-slug" required hint="the page’s web address">
                  Address
                </Label>
                <input
                  id="content-slug"
                  value={draft.slug}
                  maxLength={100}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set("slug", e.currentTarget.value.toLowerCase().replace(/\s+/g, "-"));
                  }}
                  className={input}
                  {...errorProps("content-slug", errors.slug)}
                />
                <FieldError id="content-slug" message={errors.slug} />
              </div>
              <div>
                <Label htmlFor="content-summary" hint="optional">
                  Summary
                </Label>
                <input
                  id="content-summary"
                  value={draft.summary}
                  maxLength={300}
                  onChange={(e) => set("summary", e.currentTarget.value)}
                  className={input}
                />
              </div>
            </>
          )}

          <div className={kind === "banners" ? "" : "lg:col-span-2"}>
            <Label
              htmlFor="content-body"
              required={kind === "faqs"}
              hint={kind === "pages" ? "a blank line starts a new paragraph" : undefined}
            >
              {labels.body}
            </Label>
            {kind === "banners" ? (
              <input
                id="content-body"
                value={draft.body}
                maxLength={300}
                placeholder="Let us create a journey around you."
                onChange={(e) => set("body", e.currentTarget.value)}
                className={input}
              />
            ) : (
              <textarea
                id="content-body"
                rows={kind === "pages" ? 12 : 5}
                value={draft.body}
                onChange={(e) => set("body", e.currentTarget.value)}
                className={textarea}
                {...errorProps("content-body", errors.body)}
              />
            )}
            <FieldError id="content-body" message={errors.body} />
          </div>

          {kind === "banners" && (
            <div className="lg:col-start-1">
              <Label htmlFor="content-action" hint="where the banner leads">
                Primary action
              </Label>
              <BannerLinkField
                id="content-action"
                value={draft.action}
                onChange={(v) => set("action", v)}
                error={errors.action}
              />
            </div>
          )}
          {kind === "faqs" && (
            <div>
              <Label htmlFor="content-category" hint="optional, groups FAQs">
                Category
              </Label>
              <input
                id="content-category"
                value={draft.category}
                maxLength={100}
                placeholder="e.g. Payments"
                onChange={(e) => set("category", e.currentTarget.value)}
                className={input}
              />
            </div>
          )}
        </div>

        {kind === "banners" && (
          <div className="mt-[24px]">
            {draft.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- storage URL or a local preview
              <img
                src={draft.imageUrl}
                alt="Banner image"
                className="aspect-[16/6] w-full object-cover lg:max-w-[1100px]"
              />
            ) : (
              <div
                className="flex aspect-[16/6] w-full items-center justify-center text-[12px] lg:max-w-[1100px]"
                style={{ backgroundColor: SAND, color: MUTED }}
              >
                No image yet
              </div>
            )}
            <div className="mt-[12px] flex flex-wrap items-center gap-[12px]">
              <button
                type="button"
                disabled={upload !== null}
                onClick={() => fileInput.current?.click()}
                className={cx(smallOutline, "min-w-[150px]")}
                style={OUTLINE_STYLE}
              >
                {upload !== null
                  ? `Uploading ${Math.round(upload * 100)}%`
                  : draft.imageUrl
                    ? "Replace image"
                    : "Upload image"}
              </button>
              {draft.mediaId && (
                <button
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, mediaId: null, imageUrl: null }))}
                  className="text-[12px] underline underline-offset-2"
                >
                  Remove image
                </button>
              )}
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(e) => {
                  void pickImage(e.currentTarget.files?.[0]);
                  e.currentTarget.value = "";
                }}
              />
            </div>
            <p className="mt-[6px] text-[11px]" style={{ color: BODY }}>
              Image crop: desktop landscape / mobile portrait. Use a wide photo (2400px or more)
              with the subject near the centre. JPEG, PNG or WebP, up to 10 MB.
            </p>
            <FieldError id="content-image" message={errors.mediaId} />
          </div>
        )}

        <div className="mt-[24px] grid gap-x-[18px] gap-y-[22px] lg:max-w-[700px] lg:grid-cols-2">
          <div>
            <Label htmlFor="content-status">Publication status</Label>
            <SelectBox
              id="content-status"
              value={draft.published ? "published" : "draft"}
              onChange={(v) => set("published", v === "published")}
              options={[
                { value: "draft", label: "Draft" },
                { value: "published", label: "Published" },
              ]}
            />
          </div>
          <div>
            <Label htmlFor="content-order" hint="lower shows first">
              Order
            </Label>
            <input
              id="content-order"
              inputMode="numeric"
              value={draft.order}
              maxLength={5}
              onChange={(e) => set("order", e.currentTarget.value.replace(/[^\d-]/g, ""))}
              className={input}
              {...errorProps("content-order", errors.order)}
            />
            <FieldError id="content-order" message={errors.order} />
          </div>
        </div>
        {kind === "pages" && (
          <div className="mt-[16px] max-w-[460px]">
            <Toggle
              id="content-home"
              label="Show on the homepage"
              text="Lists this page on the homepage when it’s published."
              checked={draft.showOnHome}
              onChange={(v) => set("showOnHome", v)}
            />
          </div>
        )}

        {notice && (
          <Notice tone={notice.tone} className="mt-[18px] lg:max-w-[700px]">
            {notice.text}
          </Notice>
        )}

        <div className="mt-[24px] flex flex-wrap gap-[14px]">
          <button
            type="submit"
            disabled={Boolean(busy) || upload !== null}
            className={cx(smallPrimary, "min-w-[130px]")}
            style={PRIMARY_STYLE}
          >
            {busy === "save" ? "Saving…" : draft.published ? "Save" : "Save draft"}
          </button>
          <button
            type="button"
            disabled={Boolean(busy) || upload !== null}
            onClick={async () => {
              const savedId = await save("preview");
              if (savedId) router.push(adminRoutes.contentPreview(kind, savedId));
            }}
            className={cx(smallOutline, "min-w-[150px]")}
            style={OUTLINE_STYLE}
          >
            {busy === "preview" ? "Saving…" : "Preview & publish"}
          </button>
          <Link
            href={adminRoutes.contentKind(kind)}
            className={cx(smallOutline, "min-w-[120px]")}
            style={OUTLINE_STYLE}
          >
            Back to content
          </Link>
          {item && !confirmDelete && (
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => setConfirmDelete(true)}
              className="text-[12px] text-[#b3261e] underline underline-offset-2"
            >
              Delete
            </button>
          )}
        </div>
        {confirmDelete && (
          <div
            role="alertdialog"
            aria-labelledby="delete-title"
            className="mt-[16px] border border-[#dcdad5] bg-white px-[16px] py-[14px] lg:max-w-[580px]"
          >
            <p id="delete-title" className="text-[14px]">
              Delete this {KIND_LABEL[kind].one.toLowerCase()}?
            </p>
            <p className="mt-[4px] text-[12px]" style={{ color: BODY }}>
              {draft.published ? "It’s removed from the website straight away. " : ""}This can’t be
              undone.
            </p>
            <div className="mt-[12px] flex flex-wrap gap-[10px]">
              <button
                type="button"
                disabled={busy === "delete"}
                onClick={() => void remove()}
                className={smallPrimary}
                style={PRIMARY_STYLE}
              >
                {busy === "delete" ? "Deleting…" : "Delete"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className={smallOutline}
                style={OUTLINE_STYLE}
              >
                Keep it
              </button>
            </div>
          </div>
        )}

        <InfoPanel title="Policy versions" className="mt-[24px]">
          For policies, keep an effective date and a published version. Existing bookings retain the
          terms accepted when they were created.
        </InfoPanel>
      </form>
    </div>
  );
}
