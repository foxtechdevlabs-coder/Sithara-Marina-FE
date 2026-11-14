import { forgetFrameList, frameId, frameList, loadImageWithRetry } from "@/lib/spin-frames";
import { isApiError } from "@/services/http/api-error";
import { getYachtSpin } from "@/services/user/yachts.service";

/*
 * One download of a yacht's 360° frames, shared by everything that needs it
 * (a hover preload and the viewer that opens a moment later). GET
 * /yachts/{slug}/spin is asked once, every frame is downloaded and decoded
 * into memory, and the decoded frames are kept until released.
 */

export type SpinSize = "large" | "small";

/** Small frames on phones, large on anything bigger. */
export const spinSizeForScreen = (): SpinSize =>
  typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
    ? "small"
    : "large";

interface Job {
  /** The decoded frames in display order. */
  promise: Promise<HTMLImageElement[]>;
  progress: { done: number; total: number };
  listeners: Set<() => void>;
  controller: AbortController;
}

const jobs = new Map<string, Job>();
/** Yachts with no 360° view, so they aren't asked again this visit. */
const noSpin = new Set<string>();

const keyOf = (slug: string, size: SpinSize) => `yacht-spin:${slug}:${size}`;

export const knownWithoutSpin = (slug: string) => noSpin.has(slug);

/** Starts (or joins) loading the frames. Rejects when there's no 360° view or it can't load. */
export function loadYachtSpin(slug: string, size: SpinSize): Job {
  const key = keyOf(slug, size);
  const existing = jobs.get(key);
  if (existing) return existing;

  const controller = new AbortController();
  const { signal } = controller;
  const images = new Map<string, HTMLImageElement>();
  const job: Job = {
    promise: Promise.resolve([]),
    progress: { done: 0, total: 0 },
    listeners: new Set(),
    controller,
  };
  const report = (done: number, total: number) => {
    job.progress = { done, total };
    job.listeners.forEach((listener) => listener());
  };
  const fetchList = () => getYachtSpin(slug, size).then((s) => s.frames.map((f) => f.url));

  async function loadAll(urls: string[]) {
    let done = urls.filter((u) => images.has(frameId(u))).length;
    report(done, urls.length);
    const results = await Promise.allSettled(
      urls
        .filter((u) => !images.has(frameId(u)))
        .map(async (url) => {
          images.set(frameId(url), await loadImageWithRetry(url, signal));
          report(++done, urls.length);
        }),
    );
    return results.some((r) => r.status === "rejected");
  }

  job.promise = (async () => {
    try {
      let urls = await frameList(key, fetchList);
      if (!urls.length) throw new Error("No frames");
      if (await loadAll(urls)) {
        // Most likely expired links (signed for about an hour): ask once for fresh ones.
        forgetFrameList(key);
        urls = await frameList(key, fetchList);
        if (await loadAll(urls)) throw new Error("Frames failed to load");
      }
      return urls.map((u) => images.get(frameId(u))!);
    } catch (error) {
      if (isApiError(error) && error.status === 404) noSpin.add(slug);
      if (jobs.get(key) === job) jobs.delete(key); // a later attempt starts again
      throw error;
    }
  })();
  job.promise.catch(() => undefined); // a preload nobody waits for mustn't raise an error
  jobs.set(key, job);
  return job;
}

/** Stops any download still running and frees the frames. */
export function releaseYachtSpin(slug: string, size: SpinSize) {
  const key = keyOf(slug, size);
  jobs.get(key)?.controller.abort();
  jobs.delete(key);
}
