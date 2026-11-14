/*
 * Loading a 360° view's frames once, into memory.
 *
 * The frame links are signed storage URLs that expire after about an hour. The
 * list is asked for once per view (shared by every viewer showing it, so a
 * remount doesn't ask again) and only asked for again when it's old or a frame
 * fails to load. Each frame is downloaded and decoded before the viewer turns,
 * then drawn from memory: turning never touches the network.
 */

/** Ask again for links older than this; they're signed for an hour. */
const LIST_MAX_AGE_MS = 50 * 60 * 1000;
const RETRIES = 3;

const lists = new Map<string, { at: number; promise: Promise<string[]> }>();

/** The frame links for `key`, asking `fetchList` only when there's no fresh answer. */
export function frameList(key: string, fetchList: () => Promise<string[]>): Promise<string[]> {
  const hit = lists.get(key);
  if (hit && Date.now() - hit.at < LIST_MAX_AGE_MS) return hit.promise;
  const promise = fetchList().catch((error: unknown) => {
    lists.delete(key); // never keep a failure
    throw error;
  });
  lists.set(key, { at: Date.now(), promise });
  return promise;
}

/** Drops the stored links, e.g. when they've expired. */
export const forgetFrameList = (key: string) => void lists.delete(key);

/** The frame's identity without the signature, so a re-signed link finds the image already loaded. */
export function frameId(url: string): string {
  try {
    const u = new URL(url);
    return u.origin + u.pathname;
  } catch {
    return url.split("?")[0] ?? url;
  }
}

const aborted = () => new DOMException("Aborted", "AbortError");

/** Downloads and decodes one image. Aborting stops the download. */
export function loadImage(url: string, signal: AbortSignal): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(aborted());
    const img = new Image();
    img.decoding = "async";
    const stop = () => {
      img.onload = img.onerror = null;
      img.src = ""; // cancels the request
      reject(aborted());
    };
    signal.addEventListener("abort", stop, { once: true });
    img.onload = () => {
      // Decoded now, so the first draw doesn't stall.
      img
        .decode()
        .catch(() => undefined)
        .then(() => {
          signal.removeEventListener("abort", stop);
          resolve(img);
        });
    };
    img.onerror = () => {
      signal.removeEventListener("abort", stop);
      reject(new Error(`Frame failed to load: ${frameId(url)}`));
    };
    img.src = url;
  });
}

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(aborted());
      },
      { once: true },
    );
  });

/** `loadImage`, tried up to three times with a growing pause. */
export async function loadImageWithRetry(url: string, signal: AbortSignal) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await loadImage(url, signal);
    } catch (error) {
      if (signal.aborted || attempt >= RETRIES) throw error;
      await wait(400 * 2 ** (attempt - 1), signal);
    }
  }
}
