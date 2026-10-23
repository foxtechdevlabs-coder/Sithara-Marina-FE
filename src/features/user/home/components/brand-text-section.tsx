const HIGHLIGHTS = [
  { title: "Private yacht charters", description: "Your own place on the water." },
  { title: "Kerala, at your pace", description: "A beautiful way to slow down." },
  { title: "Beyond the coastline", description: "Follow your sense of wonder." },
] as const;

/**
 * Numbered brand strip directly below the hero. Stacks on phones; three
 * columns with hairline dividers from `md`, matching the reference at `xl`.
 */
export function BrandTextSection() {
  return (
    <section aria-label="Why Sithara Marina" className="bg-surface font-brand">
      <ol className="divide-forest/10 md:divide-forest/8 flex flex-col divide-y px-5 py-4 sm:px-10 md:grid md:grid-cols-3 md:divide-x md:divide-y-0 md:py-9 lg:px-24 xl:pl-0">
        {HIGHLIGHTS.map((item, index) => (
          <li
            key={item.title}
            className="flex gap-4 py-5 md:flex-col md:gap-2 md:py-0 md:pl-6 md:first:pl-0 lg:pl-8 xl:flex-row xl:gap-[1.125rem] xl:pl-[7.8vw] xl:first:pl-24"
          >
            <span
              aria-hidden="true"
              className="text-sage-muted pt-[0.4rem] text-[0.8125rem] leading-none tracking-[0.12em] tabular-nums md:pt-0 xl:pt-[0.4rem]"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <h2 className="text-forest font-serif text-[1.625rem] leading-[1.1] md:text-[1.375rem] lg:text-[1.625rem] xl:text-[clamp(1.75rem,1.97vw,2.125rem)]">
                {item.title}
              </h2>
              <p className="text-sage mt-1 text-[0.9375rem] leading-snug md:text-sm xl:text-[0.9rem]">
                {item.description}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
