"use client";

import Link from "next/link";
import { useState } from "react";

import { BODY, MUTED, SAND } from "@/components/admin/admin-theme";
import { Label, LoadState, Notice, PRIMARY_STYLE, SelectBox } from "@/components/admin/form-parts";
import { adminRoutes } from "@/constants/routes";
import {
  PageHeader,
  pagePadding,
  SegmentTabs,
  smallPrimary,
} from "@/features/admin/bookings/components/booking-ui";
import { formatInstant } from "@/features/admin/bookings/utils/booking-format";
import { useAdminQuery } from "@/features/admin/fleet/hooks/use-admin-query";
import { Pager } from "@/features/admin/reports/components/report-parts";
import { cx } from "@/lib/cx";
import {
  CONTENT_KINDS,
  listContent,
  type Banner,
  type ContentKind,
  type ContentPage,
  type Faq,
} from "@/services/admin/content.service";

import { contentErrorMessage, KIND_LABEL } from "../utils/content-format";

const PAGE_SIZE = 20;

function Status({ published }: { published: boolean }) {
  return (
    <span
      className="px-[6px] py-[1px] text-[10px]"
      style={{ backgroundColor: published ? "#dfe9f6" : SAND }}
    >
      {published ? "Published" : "Draft"}
    </span>
  );
}

/** Content: website banners, pages and FAQs (GET /admin/banners, /admin/pages, /admin/faqs). */
export function ContentList({
  initialKind = "banners",
  notice,
}: {
  initialKind?: ContentKind;
  notice?: string;
}) {
  const [kind, setKind] = useState<ContentKind>(initialKind);
  const [status, setStatus] = useState<"" | "published" | "draft">("");
  const [page, setPage] = useState(1);
  const query = { page, limit: PAGE_SIZE, ...(status ? { status } : {}) };
  const list = useAdminQuery(
    (signal) => listContent(kind, query, signal).then((r) => ({ kind, ...r })),
    `content:${kind}:${JSON.stringify(query)}`,
  );
  // The hook keeps the last answer while loading: only show a list under its own tab.
  const data = list.data?.kind === kind && !list.error ? list.data : null;
  const items = [...(data?.items ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className={pagePadding}>
      <PageHeader
        title="Words and images, considered."
        subtitle="Content editor · Website banners, pages and FAQs."
      />
      {notice === "deleted" && <Notice className="mt-[18px] lg:max-w-[880px]">Deleted.</Notice>}
      {notice === "published" && (
        <Notice className="mt-[18px] lg:max-w-[880px]">Published. It’s live on the website.</Notice>
      )}

      <div className="mt-[24px] flex flex-wrap items-end justify-between gap-[14px] lg:mt-[30px]">
        <SegmentTabs
          label="Content type"
          value={kind}
          onChange={(v) => {
            setKind(v);
            setPage(1);
          }}
          options={CONTENT_KINDS.map((k) => ({ value: k, label: KIND_LABEL[k].many }))}
        />
        <Link
          href={adminRoutes.contentNew(kind)}
          className={cx(smallPrimary, "min-w-[150px]")}
          style={PRIMARY_STYLE}
        >
          + New {KIND_LABEL[kind].one.toLowerCase()}
        </Link>
      </div>

      <div className="mt-[18px] w-full sm:w-[240px]">
        <Label htmlFor="content-status">Publication status</Label>
        <SelectBox
          id="content-status"
          value={status}
          onChange={(v) => {
            setStatus(v as "" | "published" | "draft");
            setPage(1);
          }}
          options={[
            { value: "", label: "Published and drafts" },
            { value: "published", label: "Published" },
            { value: "draft", label: "Drafts" },
          ]}
        />
      </div>

      <div className="mt-[20px]">
        {!data ? (
          <LoadState
            loading={list.loading}
            error={
              list.error
                ? `Couldn't load ${KIND_LABEL[kind].many.toLowerCase()}. ${contentErrorMessage(list.error)}`
                : undefined
            }
            onRetry={list.reload}
            label="Loading content"
          />
        ) : !items.length ? (
          <p className="text-[13px]" style={{ color: BODY }}>
            {status
              ? "Nothing matches this status."
              : `No ${KIND_LABEL[kind].many.toLowerCase()} yet.`}
          </p>
        ) : (
          <div className={cx(list.loading && "opacity-60")}>
            <ul
              className={cx(
                "grid gap-[12px]",
                kind === "banners" && "sm:grid-cols-2 lg:grid-cols-3",
              )}
            >
              {items.map((item) => (
                <li key={item.id} className="border border-[#e3e1dc] bg-white">
                  <Link
                    href={adminRoutes.contentItem(kind, item.id)}
                    className="block h-full hover:bg-[#fcfbf9] focus-visible:outline-2 focus-visible:outline-[#0d1b2a]"
                  >
                    {kind === "banners" ? (
                      <BannerCard banner={item as Banner} />
                    ) : kind === "pages" ? (
                      <PageRow page={item as ContentPage} />
                    ) : (
                      <FaqRow faq={item as Faq} />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
            <Pager
              page={page}
              total={data.total}
              limit={PAGE_SIZE}
              busy={list.loading}
              onPage={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function BannerCard({ banner: b }: { banner: Banner }) {
  return (
    <>
      {b.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
        <img src={b.image_url} alt="" className="aspect-[16/7] w-full object-cover" />
      ) : (
        <div
          className="flex aspect-[16/7] items-center justify-center text-[11px]"
          style={{ backgroundColor: SAND, color: MUTED }}
        >
          No image yet
        </div>
      )}
      <div className="px-[16px] py-[14px]">
        <p className="flex flex-wrap items-baseline gap-x-[8px] text-[15px]">
          <span className="break-words">{b.title}</span>
          <Status published={b.is_published} />
        </p>
        {b.subtitle && (
          <p className="mt-[4px] line-clamp-2 text-[12px]" style={{ color: BODY }}>
            {b.subtitle}
          </p>
        )}
        <p className="mt-[6px] text-[10px]" style={{ color: MUTED }}>
          Order {b.sort_order}
          {b.link_url ? ` · links to ${b.link_url}` : ""}
        </p>
      </div>
    </>
  );
}

function PageRow({ page: p }: { page: ContentPage }) {
  return (
    <div className="px-[18px] py-[14px]">
      <p className="flex flex-wrap items-baseline gap-x-[8px] text-[15px]">
        <span className="break-words">{p.title}</span>
        <Status published={p.is_published} />
        {p.show_on_home && (
          <span className="text-[10px]" style={{ color: MUTED }}>
            On the homepage
          </span>
        )}
      </p>
      <p className="mt-[4px] text-[12px] break-all" style={{ color: BODY }}>
        /{p.slug}
        {p.summary ? ` · ${p.summary}` : ""}
      </p>
      <p className="mt-[4px] text-[10px]" style={{ color: MUTED }}>
        {p.published_at
          ? `Published ${formatInstant(p.published_at)}`
          : `Edited ${formatInstant(p.updated_at)}`}
      </p>
    </div>
  );
}

function FaqRow({ faq: f }: { faq: Faq }) {
  return (
    <div className="px-[18px] py-[14px]">
      <p className="flex flex-wrap items-baseline gap-x-[8px] text-[15px]">
        <span className="break-words">{f.question}</span>
        <Status published={f.is_published} />
      </p>
      <p className="mt-[4px] line-clamp-2 text-[12px]" style={{ color: BODY }}>
        {f.answer}
      </p>
      <p className="mt-[4px] text-[10px]" style={{ color: MUTED }}>
        {f.category ? `${f.category} · ` : ""}Order {f.sort_order}
      </p>
    </div>
  );
}
