"use client";

import { ArrowLeft, ArrowRight, Play } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent,
  type TransitionEvent,
} from "react";

import { MarinaFonts } from "@/components/user/marina-chrome";
import { Reveal } from "@/components/shared/reveal";
import { cx } from "@/lib/cx";
import {
  listGuestVideos,
  playableGuestVideos,
  type GuestVideo,
} from "@/services/user/content.service";

const SWITZER = "font-['Switzer',ui-sans-serif,system-ui,sans-serif]";

/** Soft blue glow (top right and bottom left), exactly as specified by design. */
const GLOW =
  "bg-[radial-gradient(50%_50%_at_50%_50%,rgba(19,106,197,0.4392)_0%,rgba(6,26,43,0)_100%)]";

/** Minimum horizontal travel (px) for a touch swipe to change cards. */
const SWIPE_THRESHOLD = 50;

/** From this many videos the carousel loops; fewer slide between the first and the last. */
const LOOP_FROM = 4;

/** Video links are signed for an hour: a list older than this is fetched again before use. */
const FRESH_MS = 45 * 60 * 1000;

type Playable = GuestVideo & { video_url: string };

const arrowButton =
  "flex size-12 items-center justify-center rounded-full bg-white/[0.04] text-white/60 transition-colors duration-300 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white disabled:pointer-events-none disabled:opacity-30 lg:size-[max(calc(var(--r)*78),2.75rem)]";

const cardWidth = "w-full shrink-0 md:w-[min(82vw,24.5rem)] lg:w-[calc(var(--rw)*392)]";
const mediaBox =
  "relative aspect-[707/760] md:aspect-[392/490] lg:aspect-auto lg:h-[calc(var(--r)*490)]";

/**
 * "Experiences worth remembering." The admin's published guest videos
 * (GET /content/guest-videos), fetched in the browser each time the section
 * loads so the one-hour video links are always fresh: heading, slider controls
 * and a carousel of video + words cards. From `lg` sizes are 1728px-reference
 * pixels times `--r` (viewport width / 1728), so the section keeps the Figma
 * proportions; small text has a readable minimum.
 */
export function GuestsSection() {
  const [videos, setVideos] = useState<Playable[] | null>(null);
  const [failed, setFailed] = useState(false);
  const loadedAt = useRef(0);
  const request = useRef<AbortController | null>(null);

  const load = useCallback(() => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    listGuestVideos({ page: 1, limit: 20 }, controller.signal).then(
      ({ items }) => {
        if (controller.signal.aborted) return;
        loadedAt.current = Date.now();
        setFailed(false);
        setVideos(playableGuestVideos(items));
      },
      () => {
        if (controller.signal.aborted) return;
        setFailed(true);
      },
    );
  }, []);

  useEffect(() => {
    load();
    // Back on a tab left open for a long time: the links may have expired.
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - loadedAt.current > FRESH_MS)
        load();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      request.current?.abort();
    };
  }, [load]);

  /** A video that fails to load may have an expired link: fetch fresh ones (at most once a minute). */
  const onVideoError = useCallback(() => {
    if (Date.now() - loadedAt.current > 60_000) load();
  }, [load]);

  const retry = () => {
    setFailed(false);
    setVideos(null);
    load();
  };

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

      {videos && videos.length > 0 ? (
        // Keyed by the list so a fresh list starts the carousel again.
        <GuestCarousel
          key={videos.map((v) => v.id).join()}
          videos={videos}
          onVideoError={onVideoError}
        />
      ) : (
        <>
          <Heading />
          <div className="mt-12 px-5 max-md:mt-8 sm:px-10 lg:mt-[calc(var(--r)*91)] lg:px-[calc(var(--rw)*114)]">
            {failed ? (
              <div role="alert" className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <p className="text-base text-white/70">Guest videos couldn’t be loaded just now.</p>
                <button
                  type="button"
                  onClick={retry}
                  className="text-sm text-white underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                >
                  Try again
                </button>
              </div>
            ) : videos ? (
              <p className="text-base text-white/70">Stories from our guests are coming soon.</p>
            ) : (
              <div
                role="status"
                aria-label="Loading guest videos"
                className="flex gap-6 overflow-hidden lg:gap-[calc(var(--rw)*48)]"
              >
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className={cx(cardWidth, i > 0 && "max-md:hidden")}>
                    <div className={cx(mediaBox, "animate-pulse bg-white/[0.04]")} />
                    <div className="mt-6 h-5 w-4/5 animate-pulse bg-white/[0.04]" />
                    <div className="mt-3 h-5 w-3/5 animate-pulse bg-white/[0.04]" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function Heading({ controls }: { controls?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-6 px-5 sm:px-10 lg:px-[calc(var(--rw)*114)]">
      <div>
        <p className="text-xs leading-[16.2px] font-normal tracking-[1.9px] text-white uppercase lg:text-[max(calc(var(--r)*12),10px)]">
          Guests
        </p>
        <Reveal
          as="h2"
          id="guests-heading"
          className="mt-6 text-[clamp(2.125rem,11vw,2.75rem)] leading-[1.1] font-normal tracking-[-1.2px] text-[#F5F1E8] md:text-[3.5rem] lg:mt-[calc(var(--r)*26)] lg:text-[calc(var(--r)*72)] lg:leading-[calc(var(--r)*84)] lg:tracking-[calc(var(--r)*-1.73)]"
        >
          Experiences
          <br />
          worth <span className="font-serif">remembering.</span>
        </Reveal>
        {controls && <div className="mt-9 md:hidden">{controls}</div>}
      </div>

      {controls && (
        <div className="mb-2 hidden md:block lg:mb-[calc(var(--r)*-26)]">{controls}</div>
      )}
    </div>
  );
}

function GuestCarousel({ videos, onVideoError }: { videos: Playable[]; onVideoError: () => void }) {
  const count = videos.length;
  const loop = count >= LOOP_FROM;
  // Looping: the track holds three copies of the cards and `position` starts on
  // the middle copy, so there are always cards on both sides. Otherwise there
  // is one copy and `position` runs from the first card to the last.
  const [position, setPosition] = useState<number>(loop ? count : 0);
  const [isAnimating, setIsAnimating] = useState(false);
  const isBusy = useRef(false);
  const touchStartX = useRef<number | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const activeIndex = ((position % count) + count) % count;

  /** Only one video plays at a time; sliding pauses them all. */
  const pauseAll = (except?: HTMLVideoElement) =>
    track.current?.querySelectorAll("video").forEach((v) => v !== except && v.pause());

  const go = (step: 1 | -1) => {
    if (isBusy.current) return; // ignore clicks while a slide is in progress
    if (!loop && (position + step < 0 || position + step > count - 1)) return;
    pauseAll();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPosition((current) =>
        loop ? count + ((((current + step) % count) + count) % count) : current + step,
      );
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
    if (loop) setPosition((current) => count + (((current % count) + count) % count));
    isBusy.current = false;
  };

  const onTouchStart = (event: TouchEvent) => {
    // A playing video's own controls (seeking) take the gesture.
    const target = event.target;
    touchStartX.current =
      target instanceof HTMLVideoElement && !target.paused
        ? null
        : (event.touches[0]?.clientX ?? null);
  };
  const onTouchEnd = (event: TouchEvent) => {
    const start = touchStartX.current;
    const end = event.changedTouches[0]?.clientX;
    touchStartX.current = null;
    if (start === null || end === undefined) return;
    const distance = end - start;
    if (Math.abs(distance) >= SWIPE_THRESHOLD) go(distance < 0 ? 1 : -1);
  };

  const controls =
    count > 1 ? (
      <div className="flex gap-[1.1875rem] lg:gap-[calc(var(--r)*19)]">
        <button
          type="button"
          aria-label="Previous guest video"
          disabled={!loop && position === 0}
          onClick={() => go(-1)}
          className={arrowButton}
        >
          <ArrowLeft aria-hidden="true" strokeWidth={1.25} className="size-5" />
        </button>
        <button
          type="button"
          aria-label="Next guest video"
          disabled={!loop && position === count - 1}
          onClick={() => go(1)}
          className={arrowButton}
        >
          <ArrowRight aria-hidden="true" strokeWidth={1.25} className="size-5" />
        </button>
      </div>
    ) : undefined;

  const copies = loop ? [0, 1, 2] : [1];

  return (
    <>
      <Heading controls={controls} />

      <p aria-live="polite" className="sr-only">
        {`Guest video ${activeIndex + 1} of ${count}: ${videos[activeIndex]?.title ?? ""}`}
      </p>

      {/* Clipped at the first card's left edge, open to the right edge (as in Figma). */}
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label="Guest videos"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className="mt-12 ml-5 overflow-hidden max-md:mt-8 max-md:mr-5 sm:ml-10 sm:max-md:mr-10 lg:mt-[calc(var(--r)*91)] lg:ml-[calc(var(--rw)*114)]"
      >
        <div
          ref={track}
          onTransitionEnd={onTransitionEnd}
          style={{ transform: `translateX(calc(var(--step) * ${-position}))` }}
          className={cx(
            "flex gap-6 max-md:[--step:calc(100%+1.5rem)] md:[--step:calc(min(82vw,24.5rem)+1.5rem)] lg:gap-[calc(var(--rw)*48)] lg:[--step:calc(var(--rw)*440)]",
            isAnimating &&
              "transition-transform duration-700 ease-[cubic-bezier(0.22,0.61,0.36,1)]",
          )}
        >
          {copies
            .flatMap((copy) => videos.map((video, index) => ({ video, index, copy })))
            .map(({ video, index, copy }) => (
              <div
                key={`${copy}-${video.id}`}
                // Only the middle copy is exposed to assistive tech and keyboard focus.
                aria-hidden={copy === 1 ? undefined : true}
                inert={copy !== 1}
                className={cardWidth}
              >
                <GuestVideoCard
                  video={video}
                  label={`${index + 1} of ${count}`}
                  onPlay={pauseAll}
                  onError={onVideoError}
                />
              </div>
            ))}
        </div>
      </div>
    </>
  );
}

/** A video with the design's play button until it starts, then the browser's controls. */
function GuestVideoCard({
  video,
  label,
  onPlay,
  onError,
}: {
  video: Playable;
  label: string;
  /** Called with this card's video when it starts playing. */
  onPlay: (video: HTMLVideoElement) => void;
  onError: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  // "#t=0.1" asks for the first frame, so phones show a still instead of a black box.
  const src = video.video_url.includes("#") ? video.video_url : `${video.video_url}#t=0.1`;
  const caption = [video.title, video.location].filter(Boolean).join(" · ");

  return (
    <figure>
      <div className={cx(mediaBox, "bg-black")}>
        <video
          ref={ref}
          src={src}
          controls={started}
          playsInline
          preload="metadata"
          aria-label={`Guest video ${label}: ${video.title}`}
          onPlay={(e) => {
            setStarted(true);
            onPlay(e.currentTarget);
          }}
          onError={onError}
          className="absolute inset-0 size-full object-cover"
        />
        {!started && (
          <button
            type="button"
            aria-label={`Play video: ${video.title}`}
            onClick={() => {
              setStarted(true);
              void ref.current?.play().catch(() => undefined);
            }}
            className="text-onyx absolute top-1/2 left-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white transition-transform duration-300 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white lg:size-[max(calc(var(--r)*50),2.25rem)]"
          >
            <Play aria-hidden="true" className="ml-0.5 size-4 fill-current" strokeWidth={0} />
          </button>
        )}
      </div>
      {video.description && (
        <blockquote className="mt-6 line-clamp-4 font-serif text-[1.25rem] leading-[1.6] tracking-normal text-[#F5F1E8] italic md:text-2xl md:leading-[31.65px] lg:mt-[calc(var(--r)*26)] lg:text-[max(calc(var(--r)*24),18px)] lg:leading-[1.319]">
          <p>“{video.description}”</p>
        </blockquote>
      )}
      <figcaption
        className={cx(
          "font-attribution text-[10px] leading-[1.6] font-normal tracking-[2.23px] text-[#F8F8F8] uppercase lg:text-[max(calc(var(--r)*10),9px)] lg:leading-none lg:tracking-[calc(var(--r)*2.23)]",
          video.description ? "mt-5 lg:mt-[calc(var(--r)*22)]" : "mt-6 lg:mt-[calc(var(--r)*26)]",
        )}
      >
        {caption}
      </figcaption>
    </figure>
  );
}
