import { ArrowRight, Plus } from "lucide-react";
import Link from "next/link";

import { MarinaFonts } from "@/components/user/marina-chrome";
import { userRoutes } from "@/constants/routes";
import { cx } from "@/lib/cx";
import { FAQ_DATA } from "@/lib/seo-schema";

const SWITZER = "font-['Switzer',ui-sans-serif,system-ui,sans-serif]";

/**
 * "A few things, before you set sail." FAQ section with accessible disclosure markup
 * and factual, authoritative answers for AI/RAG crawlers and users.
 */
export function FaqSection() {
  return (
    <section
      aria-labelledby="faq-heading"
      className={cx(
        "bg-surface py-20 lg:grid lg:grid-cols-[calc(var(--r)*709)_calc(var(--r)*701)] lg:pt-[calc(var(--r)*50)] lg:pb-[calc(var(--r)*150)] lg:pl-[calc(var(--r)*101)] lg:[--r:calc(100vw/1728)]",
        SWITZER,
      )}
    >
      <MarinaFonts />

      <div className="px-5 sm:px-10 lg:px-0 lg:pt-[calc(var(--r)*9)]">
        <p className="text-onyx text-[0.6875rem] leading-none tracking-[0.18em] uppercase lg:text-[max(calc(var(--r)*11),10px)]">
          Good to know
        </p>
        <h2
          id="faq-heading"
          className="text-forest mt-5 text-[2.75rem] leading-[1.15] font-normal tracking-[-0.03em] md:text-[3.5rem] lg:mt-[calc(var(--r)*24)] lg:text-[calc(var(--r)*72)] lg:leading-[calc(var(--r)*84)]"
        >
          A few things,
          <br />
          before you <span className="font-serif tracking-[-0.01em]">set sail.</span>
        </h2>
        <p className="text-graphite mt-6 text-[1.0625rem] leading-snug lg:mt-[calc(var(--r)*28)] lg:text-[max(calc(var(--r)*18),15px)]">
          New to private yachting? You’re in good hands.
        </p>
        <Link
          href={userRoutes.planCharter}
          className="font-attribution border-brand-950 text-brand-950 hover:bg-brand-950 mt-9 inline-flex h-[3.25rem] items-center gap-4 border px-[1.875rem] text-[11px] leading-none font-semibold tracking-[2.42px] uppercase transition-colors duration-300 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current lg:mt-[calc(var(--r)*58)] lg:h-[max(calc(var(--r)*53),2.75rem)] lg:px-[calc(var(--r)*30)]"
        >
          Ask us anything
          <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
        </Link>
      </div>

      <div className="mx-5 mt-14 border-t border-[#E7EAE4] sm:mx-10 lg:mx-0 lg:mt-0">
        {FAQ_DATA.map((item, index) => (
          <details
            key={item.question}
            className="group border-b border-[#E7EAE4] py-6 lg:py-[calc(var(--r)*24)]"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 focus-visible:outline-2 focus-visible:outline-brand-950 lg:gap-[calc(var(--r)*22)] [&::-webkit-details-marker]:hidden">
              <span
                aria-hidden="true"
                className="w-7 shrink-0 text-[0.9375rem] tracking-[0.06em] text-[#A69E83] tabular-nums lg:w-[calc(var(--r)*28)] lg:text-[max(calc(var(--r)*19),14px)]"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="text-forest flex-1 text-[1.0625rem] font-medium leading-snug lg:text-[max(calc(var(--r)*20.5),15px)]">
                {item.question}
              </span>
              <Plus
                aria-hidden="true"
                strokeWidth={1.5}
                className="text-forest/60 size-4 shrink-0 transition-transform duration-200 group-open:rotate-45 lg:size-[max(calc(var(--r)*17),14px)]"
              />
            </summary>
            <div className="pt-4 pr-6 pl-11 text-graphite text-[0.9375rem] leading-[1.6] lg:pl-[calc(var(--r)*50)] lg:text-[max(calc(var(--r)*16),14px)]">
              <p>{item.answer}</p>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
