import { ArrowRight } from "lucide-react";
import Image from "next/image";

/**
 * "Welcome to Sithara Marina" introduction with the Heritage / Mission gallery.
 * From `xl` the three gallery columns are sized in `vw` to keep the
 * reference proportions; smaller screens use two columns, then one.
 */
export function AboutSection() {
  return (
    <section aria-labelledby="about-heading" className="bg-surface font-brand pt-20 pb-20 lg:pt-24">
      <div className="mx-auto max-w-[52rem] px-5 text-center sm:px-10">
        <p className="text-midnight text-[0.6875rem] tracking-[0.2em] uppercase">
          Welcome to Sithara Marina
        </p>
        <h2
          id="about-heading"
          className="text-midnight mt-5 text-[clamp(2.5rem,4.03vw,4.35rem)] leading-[1.08] font-normal tracking-[-0.03em] lg:mt-6"
        >
          Private yachting,
          <br />
          with a <span className="font-serif tracking-[-0.01em]">Kerala</span>{" "}
          <em className="font-serif tracking-[-0.01em]">soul.</em>
        </h2>
        <p className="text-graphite mx-auto mt-7 max-w-[32rem] text-lg leading-[1.3] lg:text-[1.2875rem] lg:leading-[1.24]">
          From the historic shores of Kochi to the tranquil waters of Kumarakom, Sithara Marina
          brings a new perspective to Kerala.
        </p>
        {/* Plain text: the About page was removed. Restore a link when it returns. */}
        <p className="text-brand-950 border-brand-950 mt-10 inline-flex items-center gap-4 border-b pb-2 text-xs tracking-[0.2em] uppercase">
          A little about us
          <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
        </p>
      </div>

      <div className="mt-16 grid gap-14 px-5 sm:px-10 md:grid-cols-2 md:gap-x-10 xl:grid-cols-[1fr_28.7vw_1fr] xl:gap-0 xl:px-[5.9vw]">
        <article className="xl:w-[16.2vw]">
          <div className="relative aspect-[7/8]">
            <Image
              src="/images/home/about-heritage.png"
              alt="A private yacht at rest on still water at dusk, palms along the shore"
              fill
              sizes="(min-width: 1280px) 17vw, (min-width: 768px) 45vw, 100vw"
              className="object-cover object-[54%_50%]"
            />
          </div>
          <h3 className="text-midnight mt-6 font-serif text-[2rem] leading-none">Heritage</h3>
          <p className="text-slate-ink mt-4 max-w-[17.75rem] text-[0.8125rem] leading-[1.6]">
            Founded by a family of seafarers, our company was born from a lifelong devotion to the
            sea and a belief that every voyage should feel effortless, elegant, and deeply personal.
          </p>
        </article>

        <div className="relative aspect-[4/5] md:order-last md:col-span-2 md:aspect-[16/10] xl:order-none xl:col-span-1 xl:mt-[2.66vw] xl:aspect-[496/600]">
          <Image
            src="/images/home/hero-yacht-img.png"
            alt="Aerial view of a yacht cruising the Kerala backwaters at sunset"
            fill
            sizes="(min-width: 1280px) 29vw, 100vw"
            unoptimized
            className="object-cover"
          />
        </div>

        <article className="xl:mt-[0.64vw] xl:w-[17.36vw] xl:justify-self-end">
          <div className="relative aspect-[15/13]">
            <Image
              src="/images/home/about-mission.jpg"
              alt="A superyacht under way on the open ocean"
              fill
              sizes="(min-width: 1280px) 18vw, (min-width: 768px) 45vw, 100vw"
              className="object-cover"
            />
          </div>
          <h3 className="text-midnight mt-6 font-serif text-[2rem] leading-none">Mission</h3>
          <p className="text-slate-ink mt-4 max-w-[17.75rem] text-[0.8125rem] leading-[1.6]">
            We curate extraordinary yacht experiences that balance timeless craftsmanship with
            refined service, creating journeys defined by privacy, comfort, and discovery.
          </p>
          <div className="relative mt-12 aspect-[5/3] xl:mt-[7.3vw]">
            <Image
              src="/images/home/about-open-sea.jpg"
              alt="Aerial view of a yacht leaving a long wake across deep blue water"
              fill
              sizes="(min-width: 1280px) 18vw, (min-width: 768px) 45vw, 100vw"
              className="object-cover"
            />
          </div>
          <ArrowRight
            aria-hidden="true"
            strokeWidth={2}
            className="text-sage-muted mt-4 size-3.5"
          />
        </article>
      </div>
    </section>
  );
}
