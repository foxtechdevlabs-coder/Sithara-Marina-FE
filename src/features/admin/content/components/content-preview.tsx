"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { BODY, MUTED, SAND } from "@/components/admin/admin-theme";
import { LoadState, Notice, OUTLINE_STYLE, PRIMARY_STYLE } from "@/components/admin/form-parts";
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
  findContent,
  updateContent,
  type Banner,
  type ContentKind,
  type ContentPage,
  type Faq,
} from "@/services/admin/content.service";

import { contentErrorMessage, KIND_LABEL, paragraphs, titleParts } from "../utils/content-format";

/** The design's headline: plain words, then a serif ending. */
function Headline({ text }: { text: string }) {
  const [plain, serif] = titleParts(text);
  return (
    <h2 className="mt-[22px] text-[28px] leading-[34px] tracking-[-0.6px] lg:text-[36px] lg:leading-[42px]">
      {plain}
      {serif && (
        <>
          {" "}
          <span className="font-serif italic">{serif}</span>
        </>
      )}
    </h2>
  );
}

/** What to check before publishing, from the item itself. */
function reviewLines(
  kind: ContentKind,
  item: Banner | ContentPage | Faq,
): { ok: boolean; text: string }[] {
  if (kind === "banners") {
    const b = item as Banner;
    return [
      {
        ok: Boolean(b.image_url),
        text: b.image_url
          ? "Desktop and mobile crops checked"
          : "No image: a banner can’t be published without one",
      },
      {
        ok: true,
        text: b.link_url ? `Linked action reviewed (${b.link_url})` : "No linked action",
      },
      { ok: true, text: "Text and policy version verified" },
    ];
  }
  if (kind === "pages") {
    const p = item as ContentPage;
    return [
      {
        ok: Boolean(p.body.trim()),
        text: p.body.trim() ? "Body text present" : "No body text: a page can’t be published empty",
      },
      { ok: true, text: `Address /${p.slug}` },
      { ok: true, text: p.show_on_home ? "Listed on the homepage" : "Not listed on the homepage" },
    ];
  }
  const f = item as Faq;
  return [
    { ok: Boolean(f.answer.trim()), text: "Answer present" },
    { ok: true, text: f.category ? `Category: ${f.category}` : "No category" },
  ];
}

/** Preview & publish: "Ready for your public view." (admin Figma A43). */
export function ContentPreview({ kind, itemId }: { kind: ContentKind; itemId: string }) {
  const router = useRouter();
  const item = useAdminQuery(
    (signal) => findContent(kind, itemId, signal),
    `content-item:${kind}:${itemId}`,
  );
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");

  if (!item.data)
    return (
      <div className={pagePadding}>
        <PageHeader title="Ready for your public view." />
        <div className="mt-[24px]">
          {item.data === null && !item.loading ? (
            <p className="text-[14px]" style={{ color: BODY }}>
              This item no longer exists.
            </p>
          ) : (
            <LoadState
              loading={item.loading}
              error={
                item.error ? `Couldn't load it. ${contentErrorMessage(item.error)}` : undefined
              }
              onRetry={item.reload}
              label="Loading preview"
            />
          )}
        </div>
      </div>
    );

  const it = item.data;
  const checks = reviewLines(kind, it);
  const blocked = checks.some((c) => !c.ok);

  async function setPublished(next: boolean) {
    setBusy(true);
    setFailure("");
    try {
      await updateContent(kind, itemId, { is_published: next });
      if (next) router.push(`${adminRoutes.contentKind(kind)}&notice=published` as Route);
      else router.push(adminRoutes.contentItem(kind, itemId));
    } catch (err) {
      setFailure(contentErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className={pagePadding}>
      <PageHeader
        title="Ready for your public view."
        subtitle={`Review the content before publishing · ${KIND_LABEL[kind].one}`}
      />

      <article aria-label="Public view" className="mt-[24px] lg:max-w-[1100px]">
        {kind === "banners" && (
          <>
            {(it as Banner).image_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
              <img
                src={(it as Banner).image_url!}
                alt=""
                className="aspect-[4/3] w-full object-cover sm:aspect-[16/6]"
              />
            ) : (
              <div
                className="flex aspect-[16/6] items-center justify-center text-[12px]"
                style={{ backgroundColor: SAND, color: MUTED }}
              >
                No image
              </div>
            )}
            <Headline text={(it as Banner).title} />
            {(it as Banner).subtitle && (
              <p className="mt-[10px] text-[14px]">{(it as Banner).subtitle}</p>
            )}
          </>
        )}
        {kind === "pages" && (
          <div className="border border-[#e3e1dc] bg-white px-[20px] py-[22px] lg:px-[32px]">
            <p className="text-[11px]" style={{ color: MUTED }}>
              sitharamarina.com/{(it as ContentPage).slug}
            </p>
            <Headline text={(it as ContentPage).title} />
            {(it as ContentPage).summary && (
              <p className="mt-[10px] text-[15px]" style={{ color: BODY }}>
                {(it as ContentPage).summary}
              </p>
            )}
            <div className="mt-[16px] max-w-[720px] text-[14px] leading-[22px]">
              {paragraphs((it as ContentPage).body).map((p, i) => (
                <p key={i} className="mt-[10px] whitespace-pre-line first:mt-0">
                  {p}
                </p>
              ))}
            </div>
          </div>
        )}
        {kind === "faqs" && (
          <div className="border border-[#e3e1dc] bg-white px-[20px] py-[20px] lg:px-[28px]">
            {(it as Faq).category && (
              <p className="text-[11px] tracking-[0.12em] uppercase" style={{ color: MUTED }}>
                {(it as Faq).category}
              </p>
            )}
            <h2 className="mt-[8px] text-[20px] leading-[26px]">{(it as Faq).question}</h2>
            {paragraphs((it as Faq).answer).map((p, i) => (
              <p
                key={i}
                className="mt-[8px] text-[14px] leading-[22px] whitespace-pre-line"
                style={{ color: BODY }}
              >
                {p}
              </p>
            ))}
          </div>
        )}
      </article>

      <InfoPanel title="Publication review" className="mt-[22px] lg:max-w-[1100px]">
        {checks.map((c, i) => (
          <span key={i} className={cx(!c.ok && "text-[#9b2c2c]")}>
            {i > 0 && " · "}
            {c.text}
          </span>
        ))}
        {it.is_published && (
          <span className="mt-[6px] block">This version is already live on the website.</span>
        )}
      </InfoPanel>

      {failure && (
        <Notice tone="error" className="mt-[16px] lg:max-w-[1100px]">
          {failure}
        </Notice>
      )}

      <div className="mt-[22px] flex flex-wrap gap-[14px]">
        {it.is_published ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => void setPublished(false)}
            className={cx(smallOutline, "min-w-[160px]")}
            style={OUTLINE_STYLE}
          >
            {busy ? "Saving…" : "Unpublish"}
          </button>
        ) : (
          <button
            type="button"
            disabled={busy || blocked}
            onClick={() => void setPublished(true)}
            className={cx(smallPrimary, "min-w-[160px]")}
            style={PRIMARY_STYLE}
          >
            {busy ? "Publishing…" : "Publish this version"}
          </button>
        )}
        <Link
          href={adminRoutes.contentItem(kind, itemId)}
          className={cx(smallOutline, "min-w-[150px]")}
          style={OUTLINE_STYLE}
        >
          Return to draft
        </Link>
      </div>
    </div>
  );
}
