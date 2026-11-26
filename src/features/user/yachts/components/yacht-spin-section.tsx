"use client";

import { YachtSpinViewer } from "./yacht-spin-viewer";

/**
 * The yacht's 360° view, built into the details hero (only for yachts with
 * `has_spin`). It fills the positioned hero box: the hero photo underneath stays
 * visible while the frames load, then the canvas covers it and visitors drag
 * (or use the arrow keys) to turn the yacht in place. If the frames can't be
 * loaded the viewer renders nothing and the photo simply remains.
 */
export function YachtSpinSection({ slug, name }: { slug: string; name: string }) {
  return (
    <YachtSpinViewer
      slug={slug}
      name={name}
      fit="cover"
      fill
      showGuide
      // An inline view: vertical swipes over it must still scroll the page.
      panY
      loading={(percent) => (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/10 bg-[#0d1b2a]/80 px-4 py-2 text-[11px] tracking-[0.18em] whitespace-nowrap text-white uppercase backdrop-blur-md lg:bottom-8"
        >
          Preparing 360° view · {percent}%
          <span className="h-px w-16 bg-white/25">
            <span
              className="block h-full bg-white transition-[width] duration-300"
              style={{ width: `${percent}%` }}
            />
          </span>
        </div>
      )}
    />
  );
}
