"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { userRoutes } from "@/constants/routes";

const INK = "#0d1b2a";
const destinations = [
  { label: "Sithara Marina", href: userRoutes.home, x: 8 },
  { label: "Our yachts", href: userRoutes.yachts, x: 36 },
  { label: "Get in touch", href: userRoutes.planCharter, x: 64 },
  { label: "Sign in", href: userRoutes.login, x: 92 },
] as const;

function cubicBezier(t: number, start: number, control1: number, control2: number, end: number) {
  const inverse = 1 - t;
  return (
    inverse ** 3 * start +
    3 * inverse ** 2 * t * control1 +
    3 * inverse * t ** 2 * control2 +
    t ** 3 * end
  );
}

function routeYAt(position: number) {
  const targetX = Math.max(4, Math.min(96, position));
  const firstSegment = targetX <= 51;
  const startX = firstSegment ? 4 : 51;
  const endX = firstSegment ? 51 : 96;
  const control1X = firstSegment ? 20 : 67;
  const control2X = firstSegment ? 35 : 76;
  const startY = firstSegment ? 70 : 46;
  const control1Y = firstSegment ? 24 : 10;
  const control2Y = firstSegment ? 82 : 16;
  const endY = firstSegment ? 46 : 68;

  let low = 0;
  let high = 1;
  for (let iteration = 0; iteration < 12; iteration += 1) {
    const middle = (low + high) / 2;
    if (cubicBezier(middle, startX, control1X, control2X, endX) < targetX) {
      low = middle;
    } else {
      high = middle;
    }
  }

  return cubicBezier((low + high) / 2, startY, control1Y, control2Y, endY);
}

function suggestedDestination(pathname: string) {
  const path = pathname.toLowerCase();

  if (path.includes("login") || path.includes("signin") || path.includes("account")) {
    return userRoutes.login;
  }
  if (path.includes("search") || path.includes("find") || path.includes("yacht")) {
    return userRoutes.yachts;
  }
  if (path.includes("fleet") || path.includes("charter")) {
    return userRoutes.yachts;
  }
  if (path.includes("plan") || path.includes("contact") || path.includes("touch")) {
    return userRoutes.planCharter;
  }
  return userRoutes.home;
}

export function NotFoundExperience() {
  const pathname = usePathname() ?? "/";
  const bestHref = suggestedDestination(pathname);
  const initialDestination =
    destinations.find((destination) => destination.href === bestHref) ?? destinations[0];
  const [position, setPosition] = useState<number>(initialDestination.x);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const selectedDestination = destinations.reduce(
    (nearest, destination) => {
      const distance = Math.abs(destination.x - position);
      return distance < nearest.distance ? { destination, distance } : nearest;
    },
    { destination: initialDestination, distance: Number.POSITIVE_INFINITY },
  ).destination;
  const markerY = routeYAt(position);

  const updatePosition = useCallback(
    (clientX: number) => {
      const bounds = trackRef.current?.getBoundingClientRect();
      if (!bounds) return;
      setPosition(Math.max(0, Math.min(100, ((clientX - bounds.left) / bounds.width) * 100)));
    },
    [setPosition],
  );

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (draggingRef.current) updatePosition(event.clientX);
    };
    const onPointerUp = () => {
      draggingRef.current = false;
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, [updatePosition]);

  return (
    <main
      id="main"
      className="font-brand mx-auto flex min-h-svh w-full max-w-6xl items-center px-5 py-8 sm:px-8 lg:px-12"
      style={{ color: INK }}
    >
      <section className="grid w-full gap-8 border-y border-[#d1d5db] py-8 sm:py-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-16 lg:py-14">
        <div>
          <p className="not-found-reveal text-[0.65rem] font-medium tracking-[0.24em] text-[#0d1b2a] uppercase">
            Sithara Marina · Error 404
          </p>
          <h1 className="mt-4 text-[#0d1b2a]">
            <span className="not-found-reveal block text-[clamp(6.5rem,19vw,12rem)] leading-[0.76] font-normal tracking-[-0.09em] text-[#0d1b2a]">
              404
            </span>
            <span className="not-found-reveal not-found-reveal-delay block pt-4 text-[clamp(3rem,6.8vw,5.25rem)] leading-[0.98] font-normal tracking-[-0.06em]">
              Page not found
            </span>
          </h1>
          <p className="not-found-reveal not-found-reveal-delay-2 mt-6 max-w-md text-base leading-7 text-[#4a4f55]">
            We couldn’t find the page you were looking for. Choose a destination and we’ll get you
            back on your way.
          </p>
          <p className="not-found-reveal not-found-reveal-delay-2 mt-5 flex min-w-0 items-center gap-3 text-sm text-[#7a7f85]">
            <span className="shrink-0 text-[0.58rem] font-medium tracking-[0.18em] uppercase">
              You tried
            </span>
            <code className="truncate text-[#1b2733]">{pathname}</code>
          </p>
        </div>

        <div className="not-found-reveal not-found-reveal-delay-2 bg-[#f5f5f5] p-5 sm:p-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[0.6rem] font-medium tracking-[0.2em] text-[#7a7f85] uppercase">
                Choose your destination
              </p>
              <h2 className="mt-2 text-xl font-normal tracking-[-0.03em] text-[#0d1b2a]">
                Where to next?
              </h2>
            </div>
            <span className="text-[0.58rem] tracking-[0.13em] text-[#7a7f85] uppercase">
              {String(destinations.indexOf(selectedDestination) + 1).padStart(2, "0")} /{" "}
              {String(destinations.length).padStart(2, "0")}
            </span>
          </div>

          <div className="mt-5 border-y border-[#d1d5db] bg-white px-3 py-4">
            <div
              ref={trackRef}
              role="slider"
              aria-label="Explore destinations"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(position)}
              aria-valuetext={selectedDestination.label}
              tabIndex={0}
              onPointerDown={(event) => {
                draggingRef.current = true;
                event.currentTarget.setPointerCapture?.(event.pointerId);
                updatePosition(event.clientX);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
                  setPosition((value) => Math.max(0, value - 5));
                } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
                  setPosition((value) => Math.min(100, value + 5));
                } else if (event.key === "Home") {
                  setPosition(0);
                } else if (event.key === "End") {
                  setPosition(100);
                }
              }}
              className="relative h-20 touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-[#0d1b2a]/40"
            >
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                aria-hidden="true"
                className="absolute inset-0 h-full w-full"
              >
                <path
                  d="M 4 70 C 20 24, 35 82, 51 46 S 76 16, 96 68"
                  fill="none"
                  stroke="#1666a3"
                  strokeWidth="1.5"
                  strokeDasharray="2 3"
                  strokeLinecap="round"
                />
              </svg>
              <span
                className="absolute flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-white bg-[#0d1b2a] shadow-md transition-[left,top] duration-300 ease-out motion-reduce:transition-none"
                style={{ left: `${position}%`, top: `${markerY}%` }}
                aria-hidden="true"
              >
                <svg
                  viewBox="0 0 32 32"
                  className="size-6"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.7"
                >
                  <path d="M4 20h24l-4.5 5H9z" fill="white" stroke="white" />
                  <path d="M15 5v14M16.5 8l7 10h-7z" fill="white" stroke="white" />
                  <path d="M5 27c2-1.5 4-1.5 6 0s4 1.5 6 0 4-1.5 6 0 4 1.5 6 0" />
                </svg>
                <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-[#0d1b2a]/20 motion-reduce:animate-none" />
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {destinations.map((destination, index) => (
              <button
                key={`${destination.href}-${index}`}
                type="button"
                aria-pressed={selectedDestination.href === destination.href}
                onClick={() => setPosition(destination.x)}
                className={`min-h-11 border px-3 text-center text-[0.65rem] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d1b2a] ${
                  selectedDestination.href === destination.href
                    ? "border-[#65a4dc] bg-gradient-to-r from-[#d7e1eb] to-[#65a4dc] text-[#0d1b2a]"
                    : "border-[#d1d5db] bg-white text-[#1b2733] hover:border-[#1666a3] hover:text-[#145284]"
                }`}
              >
                {destination.label}
              </button>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-[#d1d5db] pt-5">
            <p className="min-w-0">
              <span className="block text-[0.56rem] font-medium tracking-[0.18em] text-[#7a7f85] uppercase">
                Suggested destination
              </span>
              <span className="mt-1 block truncate text-lg tracking-[-0.02em] text-[#0d1b2a]">
                {selectedDestination.label}
              </span>
            </p>
            <div className="flex flex-wrap items-center">
              <Link
                href={selectedDestination.href}
                className="inline-flex min-h-11 items-center gap-3 border border-[#061a2b] px-4 text-[0.6rem] font-medium tracking-[0.14em] text-[#061a2b] uppercase transition-colors duration-300 hover:bg-[#061a2b] hover:text-[#f6f2ea] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
              >
                Continue <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
