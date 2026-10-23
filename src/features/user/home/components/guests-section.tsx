"use client";

import { ArrowLeft, ArrowRight, Play } from "lucide-react";
import Image from "next/image";
import { useRef, useState, type TouchEvent, type TransitionEvent } from "react";

import { MarinaFonts } from "@/components/user/marina-chrome";
import { cx } from "@/lib/cx";

const SWITZER = "font-['Switzer',ui-sans-serif,system-ui,sans-serif]";

/** Soft blue glow (top right and bottom left), exactly as specified by design. */
const GLOW =
  "bg-[radial-gradient(50%_50%_at_50%_50%,rgba(19,106,197,0.4392)_0%,rgba(6,26,43,0)_100%)]";

const PLACEHOLDER_QUOTE =
  "Placeholder quote — to be replaced with a real, approved guest testimonial.";

// Content as shown in the design reference, including its placeholder quotes
// and the repeated last attribution; replace with approved testimonials.
const TESTIMONIALS = [
  {
    quote: "“Kerala feels completely different from the water. An unforgettable experience.”",
    name: "Arjun Mehta",
    role: "Travel Photographer",
    image: "/images/home/guest-arjun-mehta.jpg",
    imageAlt: "A smiling guest leaning out from a yacht's side deck",
    position: "50% 80%",
  },
  {
    quote: PLACEHOLDER_QUOTE,
    name: "Sofia Laurent",
    role: "Marine Biologist",
    image: "/images/home/guest-sofia-laurent.jpg",
    imageAlt: "A guest relaxing on a yacht deck with a glass of wine",
    position: "50% 30%",
  },
  {
    quote: PLACEHOLDER_QUOTE,
    name: "Daniel Carter",
    role: "Executive Chef",
    image: "/images/home/guest-daniel-carter-bridge.jpg",
    imageAlt: "A couple standing on a yacht's bow in front of a lift bridge",
    position: "50% 50%",
  },
  {
    quote: PLACEHOLDER_QUOTE,
    name: "Daniel Carter",
    role: "Executive Chef",
    image: "/images/home/guest-group-deck.jpg",
    imageAlt: "Friends toasting with champagne on a yacht's deck",
    position: "55% 50%",
  },
] as const;

/** Minimum horizontal travel (px) for a touch swipe to change cards. */
const SWIPE_THRESHOLD = 50;

const arrowButton =
  "flex size-12 items-center justify-center rounded-full bg-white/[0.04] text-white/60 transition-colors duration-300 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white lg:size-[max(calc(var(--r)*78),2.75rem)]";

/**
 * "Experiences worth remembering." guest testimonials: heading, slider
 * controls and a looping carousel of photo + quote cards. From `lg`
 * sizes are 1728px-reference pixels times `--r` (viewport width / 1728), so the
 * section keeps the Figma proportions and the fourth card runs off the right
 * edge; small text has a readable minimum.
 */
export function GuestsSection() {
  const count = TESTIMONIALS.length;
  // The track holds three copies of the cards; `position` indexes into it and
  // starts on the middle copy so there are always cards on both sides.
  const [position, setPosition] = useState(count);
  const [isAnimating, setIsAnimating] = useState(false);
  const isBusy = useRef(false);
  const touchStartX = useRef<number | null>(null);
  const activeIndex = ((position % count) + count) % count;

  const go = (step: 1 | -1) => {
    if (isBusy.current) return; // ignore clicks while a slide is in progress
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPosition((current) => count + ((((current + step) % count) + count) % count));
      return;
    }
    isBusy.current = true;
    setIsAnimating(true);
    setPosition((current) => current + step);
  };

  // After sliding onto the first or last copy, jump (without animation) to the
  // same card in the middle copy, so the loop never runs out of cards.
  const onTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || event.propertyName !== "transform") return;
    setIsAnimating(false);
    setPosition((current) => count + (((current % count) + count) % count));
    isBusy.current = false;
  };

  const onTouchStart = (event: TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (event: TouchEvent) => {
    const start = touchStartX.current;
    const end = event.changedTouches[0]?.clientX;
    touchStartX.current = null;
    if (start === null || end === undefined) return;
    const distance = end - start;
    if (Math.abs(distance) >= SWIPE_THRESHOLD) go(distance < 0 ? 1 : -1);
  };

  const controls = (
    <div className="flex gap-[1.1875rem] lg:gap-[calc(var(--r)*19)]">
      <button
        type="button"
        aria-label="Previous testimonial"
        onClick={() => go(-1)}
        className={arrowButton}
      >
        <ArrowLeft aria-hidden="true" strokeWidth={1.25} className="size-5" />
      </button>
      <button
        type="button"
        aria-label="Next testimonial"
        onClick={() => go(1)}
        className={arrowButton}
      >
        <ArrowRight aria-hidden="true" strokeWidth={1.25} className="size-5" />
      </button>
    </div>
  );

  return (
    <section
      aria-labelledby="guests-heading"
      className={cx(
        "bg-brand-950 relative isolate overflow-hidden pt-20 pb-20 lg:pt-[calc(var(--r)*115)] lg:pb-[calc(var(--r)*107)] lg:[--rw:calc(100vw/1728)] lg:[--r:min(var(--rw),calc(100svh/1180))]",
        SWITZER,
      )}
    >
      <MarinaFonts />
      <div
        aria-hidden="true"
        className={cx(
          "pointer-events-none absolute -top-[15%] right-[-30%] -z-10 aspect-[11/7] w-[110%] md:right-[-15%] md:w-[70%] lg:top-[calc(var(--r)*-310)] lg:right-[calc(var(--r)*-210)] lg:w-[calc(var(--r)*1100)]",
          GLOW,
        )}
      />
      <div
        aria-hidden="true"
        className={cx(
          "pointer-events-none absolute -bottom-[10%] left-[-40%] -z-10 aspect-[11/5] w-[110%] md:w-[70%] lg:bottom-[calc(var(--r)*-250)] lg:left-[calc(var(--r)*-300)] lg:w-[calc(var(--r)*1100)]",
          GLOW,
        )}
      />

      <div className="flex items-end justify-between gap-6 px-5 sm:px-10 lg:px-[calc(var(--rw)*114)]">
        <div>
          <p className="text-xs leading-[16.2px] font-normal tracking-[1.9px] text-white uppercase lg:text-[max(calc(var(--r)*12),10px)]">
            Guests
          </p>
          <h2
            id="guests-heading"
            className="text-[#F5F1E8] mt-6 text-[clamp(2.125rem,11vw,2.75rem)] leading-[1.1] font-normal tracking-[-1.2px] md:text-[3.5rem] lg:mt-[calc(var(--r)*26)] lg:text-[calc(var(--r)*72)] lg:leading-[calc(var(--r)*84)] lg:tracking-[calc(var(--r)*-1.73)]"
          >
            Experiences
            <br />
            worth <span className="font-serif">remembering.</span>
          </h2>
        </div>

        <div className="mb-2 hidden md:block lg:mb-[calc(var(--r)*-26)]">{controls}</div>
      </div>

      <p aria-live="polite" className="sr-only">
        {`Testimonial ${activeIndex + 1} of ${count}: ${TESTIMONIALS[activeIndex]?.name ?? ""}`}
      </p>

      {/* Clipped at the first card's left edge, open to the right edge (as in Figma). */}
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label="Guest testimonials"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="mt-12 ml-5 overflow-hidden sm:ml-10 lg:mt-[calc(var(--r)*91)] lg:ml-[calc(var(--rw)*114)]"
      >
        <div
          onTransitionEnd={onTransitionEnd}
          style={{ transform: `translateX(calc(var(--step) * ${-position}))` }}
          className={cx(
            "flex gap-6 [--step:calc(min(82vw,24.5rem)+1.5rem)] lg:gap-[calc(var(--rw)*48)] lg:[--step:calc(var(--rw)*440)]",
            isAnimating &&
              "transition-transform duration-700 ease-[cubic-bezier(0.22,0.61,0.36,1)]",
          )}
        >
          {[0, 1, 2]
            .flatMap((copy) => TESTIMONIALS.map((item, index) => ({ item, index, copy })))
            .map(({ item, index, copy }) => (
              <div
                key={`${copy}-${index}`}
                // Only the middle copy is exposed to assistive tech and keyboard focus.
                aria-hidden={copy === 1 ? undefined : true}
                inert={copy !== 1}
                className="w-[min(82vw,24.5rem)] shrink-0 lg:w-[calc(var(--rw)*392)]"
              >
                <figure>
                  <div className="relative aspect-[392/490] lg:aspect-auto lg:h-[calc(var(--r)*490)]">
                    <Image
                      src={item.image}
                      alt={item.imageAlt}
                      fill
                      sizes="(min-width: 1024px) 23vw, 78vw"
                      className="object-cover"
                      style={{ objectPosition: item.position }}
                    />
                    <span
                      aria-hidden="true"
                      className="text-onyx absolute top-1/2 left-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white lg:size-[max(calc(var(--r)*50),2.25rem)]"
                    >
                      <Play className="ml-0.5 size-4 fill-current" strokeWidth={0} />
                    </span>
                  </div>
                  <blockquote className="text-[#F5F1E8] mt-6 font-serif text-2xl leading-[31.65px] tracking-normal italic lg:mt-[calc(var(--r)*26)] lg:text-[max(calc(var(--r)*24),18px)] lg:leading-[1.319]">
                    <p>{item.quote}</p>
                  </blockquote>
                  <figcaption className="font-attribution mt-5 text-[10px] leading-[1.6] lg:leading-none font-normal tracking-[2.23px] text-[#F8F8F8] uppercase lg:mt-[calc(var(--r)*22)] lg:text-[max(calc(var(--r)*10),9px)] lg:tracking-[calc(var(--r)*2.23)]">
                    {item.name} · {item.role}
                  </figcaption>
                </figure>
              </div>
            ))}
        </div>
      </div>

      <div className="mt-8 flex justify-end px-5 sm:px-10 md:hidden">{controls}</div>
    </section>
  );
}
