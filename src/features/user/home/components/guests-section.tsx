"use client";

import { ArrowLeft, ArrowRight, Play } from "lucide-react";
import {
  useRef,
  useState,
  type ReactNode,
  type SyntheticEvent,
  type TouchEvent,
  type TransitionEvent,
} from "react";

import { MarinaFonts } from "@/components/user/marina-chrome";
import { Reveal } from "@/components/shared/reveal";
import { cx } from "@/lib/cx";

import { useGuestVideos, type PlayableGuestVideo } from "../hooks/use-guest-videos";

const SWITZER = "font-['Switzer',ui-sans-serif,system-ui,sans-serif]";

/** Soft blue glow (top right and bottom left), exactly as specified by design. */
const GLOW =
  "bg-[radial-gradient(50%_50%_at_50%_50%,rgba(19,106,197,0.4392)_0%,rgba(6,26,43,0)_100%)]";

/** Minimum horizontal travel (px) for a touch swipe to change cards. */
const SWIPE_THRESHOLD = 50;

/**
 * From this many videos the carousel loops (three copies of the cards); fewer
 * would show repeats side by side on wide screens, so they slide between the
 * first and last card instead.
 */
const LOOP_MIN = 4;

/** Up to three cards fit side by side from `lg`, so fewer need no controls there. */
const FITS_ON_LG = 3;

const arrowButton =
  "flex size-12 items-center justify-center rounded-full bg-white/[0.04] text-white/60 transition-colors duration-300 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white disabled:pointer-events-none disabled:opacity-40 lg:size-[max(calc(var(--r)*78),2.75rem)]";

const CARD = "w-full shrink-0 md:w-[min(82vw,24.5rem)] lg:w-[calc(var(--rw)*392)]";
const MEDIA =
  "relative aspect-[707/760] md:aspect-[392/490] lg:aspect-auto lg:h-[calc(var(--r)*490)]";
const QUOTE =
  "text-[#F5F1E8] mt-6 font-serif text-[1.25rem] leading-[1.6] md:text-2xl md:leading-[31.65px] tracking-normal italic lg:mt-[calc(var(--r)*26)] lg:text-[max(calc(var(--r)*24),18px)] lg:leading-[1.319]";
const CAPTION =
  "font-attribution mt-5 text-[10px] leading-[1.6] lg:leading-none font-normal tracking-[2.23px] text-[#F8F8F8] uppercase lg:mt-[calc(var(--r)*22)] lg:text-[max(calc(var(--r)*10),9px)] lg:tracking-[calc(var(--r)*2.23)]";
const VIEWPORT =
  "mt-12 ml-5 max-md:mt-8 max-md:mr-5 sm:ml-10 sm:max-md:mr-10 lg:mt-[calc(var(--r)*91)] lg:ml-[calc(var(--rw)*114)]";

/**
 * "Experiences worth remembering.": the guest videos published from the admin
 * panel (GET /content/guest-videos), as a carousel of video + description
 * cards. From `lg` sizes are 1728px-reference pixels times `--r` (viewport
 * width / 1728), so the section keeps the Figma proportions; small text has a
 * readable minimum. With no published videos the section is left out.
 */
export function GuestsSection() {
  const { state, retry, onVideoError } = useGuestVideos();

  if (state.status === "ready" && state.videos.length === 0) return null;

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

      {state.status === "ready" ? (
        <GuestVideoCarousel
          // A different number of videos (after renewing the links) starts the carousel afresh.
          key={state.videos.length}
          videos={state.videos}
          onVideoError={onVideoError}
        />
      ) : (
        <>
          <Heading />
          {state.status === "loading" ? <LoadingCards /> : <LoadError onRetry={retry} />}
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
          className="text-[#F5F1E8] mt-6 text-[clamp(2.125rem,11vw,2.75rem)] leading-[1.1] font-normal tracking-[-1.2px] md:text-[3.5rem] lg:mt-[calc(var(--r)*26)] lg:text-[calc(var(--r)*72)] lg:leading-[calc(var(--r)*84)] lg:tracking-[calc(var(--r)*-1.73)]"
        >
          Experiences
          <br />
          worth <span className="font-serif">remembering.</span>
        </Reveal>
        {controls && <div className="mt-9 md:hidden">{controls}</div>}
      </div>

      {controls && <div className="mb-2 hidden md:block lg:mb-[calc(var(--r)*-26)]">{controls}</div>}
    </div>
  );
}

/** Placeholder cards in the carousel's shape while the videos load. */
function LoadingCards() {
  return (
    <div className={cx(VIEWPORT, "overflow-hidden")}>
      <p role="status" className="sr-only">
        Loading guest videos
      </p>
      <div aria-hidden="true" className="flex gap-6 lg:gap-[calc(var(--rw)*48)]">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className={cx(CARD, index > 0 && "max-md:hidden")}>
            <div className={cx(MEDIA, "animate-pulse bg-white/[0.06] motion-reduce:animate-none")} />
            <div className="mt-6 h-5 w-4/5 animate-pulse bg-white/[0.06] motion-reduce:animate-none lg:mt-[calc(var(--r)*26)]" />
            <div className="mt-3 h-5 w-3/5 animate-pulse bg-white/[0.06] motion-reduce:animate-none" />
            <div className="mt-5 h-2.5 w-2/5 animate-pulse bg-white/[0.06] motion-reduce:animate-none lg:mt-[calc(var(--r)*22)]" />
          </div>
        ))}
      </div>
    </div>
  );
}

function LoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className={cx(VIEWPORT, "flex flex-col items-start gap-6")}>
      <p className="max-w-[28rem] text-[0.9375rem] leading-[1.6] text-[#F5F1E8]/80 lg:text-[max(calc(var(--r)*16),14px)]">
        Our guests’ videos couldn’t be loaded just now.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="border-b border-white/60 pb-1.5 text-xs leading-none tracking-[1.9px] text-white uppercase transition-opacity duration-300 hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white lg:text-[max(calc(var(--r)*12),10px)]"
      >
        Try again
      </button>
    </div>
  );
}

/**
 * One guest video with the design's centred play button. The button plays the
 * video itself and shows whenever the video is not playing (before the first
 * play, when paused, and when it has ended, to play again). Native controls
 * (pause, seek, volume, fullscreen) appear once the video has been played, so
 * the browser's own play button never doubles the design's before that.
 */
function GuestVideoPlayer({
  video,
  played,
  onPlay,
  onError,
}: {
  video: PlayableGuestVideo;
  /** Played since the carousel last moved: native controls on, whole frame shown. */
  played: boolean;
  onPlay: (event: SyntheticEvent<HTMLVideoElement>) => void;
  onError: () => void;
}) {
  const element = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const play = () => {
    const el = element.current;
    if (!el) return;
    // play() rejects when playback can't start (unsupported or expired link,
    // blocked by the browser); the button then simply stays.
    el.play().catch(() => setIsPlaying(false));
  };

  return (
    <div className={cx(MEDIA, "overflow-hidden bg-black")}>
      <video
        ref={element}
        src={video.video_url}
        controls={played}
        preload="metadata"
        playsInline
        aria-label={video.title}
        onPlay={(event) => {
          setIsPlaying(true);
          onPlay(event);
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onError={() => {
          setIsPlaying(false);
          onError();
        }}
        className={cx(
          "absolute inset-0 size-full",
          // Fills the card like the design's photos; once played, the whole frame shows.
          played ? "object-contain" : "object-cover",
        )}
      />
      {!isPlaying && (
        <button
          type="button"
          onClick={play}
          aria-label={`Play ${video.title}`}
          className="text-onyx absolute top-1/2 left-1/2 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white transition-transform duration-300 hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white motion-reduce:transition-none lg:size-[max(calc(var(--r)*50),2.25rem)]"
        >
          <Play aria-hidden="true" className="ml-0.5 size-4 fill-current" strokeWidth={0} />
        </button>
      )}
    </div>
  );
}

function GuestVideoCarousel({
  videos,
  onVideoError,
}: {
  videos: PlayableGuestVideo[];
  onVideoError: () => void;
}) {
  const count = videos.length;
  const loops = count >= LOOP_MIN;
  // When looping the track holds three copies of the cards; `position` indexes
  // into it and starts on the middle copy so there are always cards on both sides.
  const copies = loops ? [0, 1, 2] : [0];
  const start = loops ? count : 0;
  const [position, setPosition] = useState<number>(start);
  const [isAnimating, setIsAnimating] = useState(false);
  /** The card whose video was played: it shows the whole frame instead of filling the card. */
  const [playedCard, setPlayedCard] = useState<string | null>(null);
  const isBusy = useRef(false);
  const touchStartX = useRef<number | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const activeIndex = ((position % count) + count) % count;

  const pauseAll = (except?: HTMLVideoElement) => {
    track.current?.querySelectorAll("video").forEach((video) => {
      if (video !== except && !video.paused) video.pause();
    });
  };

  const go = (step: 1 | -1) => {
    if (isBusy.current) return; // ignore clicks while a slide is in progress
    if (!loops && (position + step < 0 || position + step > count - 1)) return;
    pauseAll();
    setPlayedCard(null);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPosition((current) =>
        loops ? count + ((((current + step) % count) + count) % count) : current + step,
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
    if (loops) setPosition((current) => count + (((current % count) + count) % count));
    isBusy.current = false;
  };

  const onTouchStart = (event: TouchEvent) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (event: TouchEvent) => {
    const begin = touchStartX.current;
    const end = event.changedTouches[0]?.clientX;
    touchStartX.current = null;
    if (begin === null || end === undefined) return;
    const distance = end - begin;
    if (Math.abs(distance) >= SWIPE_THRESHOLD) go(distance < 0 ? 1 : -1);
  };

  /** One video plays at a time. */
  const onPlay = (card: string) => (event: SyntheticEvent<HTMLVideoElement>) => {
    pauseAll(event.currentTarget);
    setPlayedCard(card);
  };

  const controls =
    count > 1 ? (
      <div
        className={cx(
          "flex gap-[1.1875rem] lg:gap-[calc(var(--r)*19)]",
          !loops && count <= FITS_ON_LG && "lg:hidden",
        )}
      >
        <button
          type="button"
          aria-label="Previous video"
          onClick={() => go(-1)}
          disabled={!loops && position === 0}
          className={arrowButton}
        >
          <ArrowLeft aria-hidden="true" strokeWidth={1.25} className="size-5" />
        </button>
        <button
          type="button"
          aria-label="Next video"
          onClick={() => go(1)}
          disabled={!loops && position === count - 1}
          className={arrowButton}
        >
          <ArrowRight aria-hidden="true" strokeWidth={1.25} className="size-5" />
        </button>
      </div>
    ) : undefined;

  return (
    <>
      <Heading controls={controls} />

      <p aria-live="polite" className="sr-only">
        {`Video ${activeIndex + 1} of ${count}: ${videos[activeIndex]?.title ?? ""}`}
      </p>

      {/* Clipped at the first card's left edge, open to the right edge (as in Figma). */}
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label="Guest videos"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        className={cx(VIEWPORT, "overflow-hidden")}
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
            .flatMap((copy) => videos.map((video) => ({ video, copy })))
            .map(({ video, copy }) => {
              const card = `${copy}-${video.id}`;
              const isPrimary = copy === (loops ? 1 : 0);
              return (
                <div
                  key={card}
                  // Only one copy is exposed to assistive tech and keyboard focus.
                  aria-hidden={isPrimary ? undefined : true}
                  inert={!isPrimary}
                  className={CARD}
                >
                  <figure>
                    <GuestVideoPlayer
                      video={video}
                      played={playedCard === card}
                      onPlay={onPlay(card)}
                      onError={onVideoError}
                    />
                    {video.description && (
                      <blockquote className={QUOTE}>
                        <p className="[overflow-wrap:anywhere]">{video.description}</p>
                      </blockquote>
                    )}
                    <figcaption className={cx(CAPTION, "[overflow-wrap:anywhere]")}>
                      {video.title}
                      {video.location ? ` · ${video.location}` : null}
                    </figcaption>
                  </figure>
                </div>
              );
            })}
        </div>
      </div>
    </>
  );
}
