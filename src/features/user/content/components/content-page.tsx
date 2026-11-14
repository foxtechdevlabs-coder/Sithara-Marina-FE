import Link from "next/link";

import { INK, SANS } from "@/components/user/marina-chrome";
import { userRoutes } from "@/constants/routes";
import { formatDateTime, MARINA_TIMEZONE } from "@/features/user/yachts/utils/yacht-view";
import type { ContentPage as ContentPageData } from "@/services/user/content.service";

import { ContentBody } from "./content-body";

const BODY = "#4a4f55";
const MUTED = "#7a7f85";
/** The Figma page frame used by the yacht pages. */
const FRAME = "mx-auto w-full max-w-[1728px] px-5 lg:px-[100px]";

/** A published content page from GET /content/pages/{slug}, in the yacht pages' Figma style. */
export function ContentPage({ page }: { page: ContentPageData }) {
  return (
    <article className="bg-white pb-[120px] antialiased lg:pb-[160px]" style={{ ...SANS, color: INK }}>
      <div className={`${FRAME} pt-[37px]`}>
        <nav aria-label="Breadcrumb" className="text-[12px] leading-[16px]" style={{ color: MUTED }}>
          <ol className="flex flex-wrap items-center gap-[12px]">
            <li>
              <Link href={userRoutes.home} className="hover:underline">
                Home
              </Link>
            </li>
            <li aria-hidden="true" className="text-[#b5b8bc]">
              /
            </li>
            <li aria-current="page" style={{ color: INK }}>
              {page.title}
            </li>
          </ol>
        </nav>

        <h1 className="motion-safe:animate-fade-up mt-[50px] max-w-[1100px] text-[48px] leading-[1.05] font-normal tracking-[-1.5px] break-words lg:mt-[70px] lg:text-[72px] lg:tracking-[-2.21px]">
          {page.title}
        </h1>
        {page.summary && (
          <p className="mt-[24px] max-w-[640px] text-[18px] leading-[28px]" style={{ color: BODY }}>
            {page.summary}
          </p>
        )}
        <p className="mt-[16px] text-[13px] leading-[18px]" style={{ color: MUTED }}>
          Last updated {formatDateTime(page.updated_at, MARINA_TIMEZONE)}
        </p>

        {page.body.trim() && <ContentBody body={page.body} />}
      </div>
    </article>
  );
}
