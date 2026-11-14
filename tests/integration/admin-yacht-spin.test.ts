import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { spinVideoProblem, spinVideoType } from "@/services/admin/media.service";

// The 360° view against a stubbed `fetch` (/admin/media/uploads, /admin/yachts/{id}/spin).
const API = "http://api.test";

const live = {
  id: "sp-1",
  frame_count: 36,
  first_frame: 1,
  reverse: false,
  processed_at: "2026-11-13T10:00:00.000Z",
  preview_frames: ["https://cdn.test/1.webp", "https://cdn.test/2.webp"],
};
const attempt = {
  id: "sp-2",
  status: "processing",
  frame_count: 48,
  error: null,
  created_at: "2026-11-13T10:05:00.000Z",
  updated_at: "2026-11-13T10:05:10.000Z",
};

type Call = { url: string; method: string; body: unknown };
let calls: Call[];
function stub(respond: (url: string, method: string) => Response) {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const method = init.method ?? "GET";
      calls.push({
        url,
        method,
        body: typeof init.body === "string" ? JSON.parse(init.body) : undefined,
      });
      return respond(url, method);
    }),
  );
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function load() {
  vi.resetModules();
  const session = await import("@/services/admin/admin-session");
  session.saveTokens({ access_token: "access-1", refresh_token: "refresh-1", expires_in: 900 });
  return import("@/services/admin/yacht-spin.service");
}

beforeEach(() => vi.stubEnv("NEXT_PUBLIC_API_URL", API));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("yacht spin service", () => {
  it("starts processing beside the live view, adjusts it and removes it", async () => {
    const svc = await load();
    stub((_, method) =>
      method === "DELETE"
        ? new Response(null, { status: 204 })
        : method === "PUT"
          ? json({ has_spin: true, live, attempt }, 202)
          : json({
              has_spin: true,
              live: { ...live, first_frame: 5, reverse: true },
              attempt: null,
            }),
    );
    const started = await svc.attachYachtSpin("y-1", "m-1", 48);
    expect(started.live?.id).toBe("sp-1"); // the old view stays live while the new one processes
    expect(started.attempt?.status).toBe("processing");
    const adjusted = await svc.updateYachtSpin("y-1", { first_frame: 5, reverse: true });
    expect(adjusted.live).toMatchObject({ first_frame: 5, reverse: true });
    await svc.deleteYachtSpin("y-1");
    expect(calls.map((c) => [c.method, c.url.replace(API, ""), c.body])).toEqual([
      ["PUT", "/admin/yachts/y-1/spin", { media_id: "m-1", frame_count: 48 }],
      ["PATCH", "/admin/yachts/y-1/spin", { first_frame: 5, reverse: true }],
      ["DELETE", "/admin/yachts/y-1/spin", undefined],
    ]);
  });

  it("defaults to 36 frames and reads a failed attempt", async () => {
    const svc = await load();
    stub(() =>
      json({
        has_spin: false,
        live: null,
        attempt: { ...attempt, status: "failed", error: "Too dark" },
      }),
    );
    await svc.attachYachtSpin("y-1", "m-1");
    expect(calls[0]?.body).toEqual({ media_id: "m-1", frame_count: 36 });
    expect((await svc.getYachtSpin("y-1")).attempt?.error).toBe("Too dark");
  });
});

describe("360° video checks", () => {
  const file = (name: string, type: string, size = 1000) =>
    new File([new Uint8Array(size)], name, { type });

  it("accepts MP4, MOV and WebM up to 200 MB, reading the type from the name if blank", () => {
    expect(spinVideoType(file("turn.mov", ""))).toBe("video/quicktime");
    expect(spinVideoType(file("turn.MP4", ""))).toBe("video/mp4");
    expect(spinVideoProblem(file("turn.webm", "video/webm"))).toBeNull();
    expect(spinVideoProblem(file("turn.avi", "video/x-msvideo"))).toMatch(/isn't an MP4/);
    expect(spinVideoProblem(file("empty.mp4", "video/mp4", 0))).toMatch(/empty/);
    const big = file("big.mp4", "video/mp4");
    Object.defineProperty(big, "size", { value: 201 * 1024 * 1024 });
    expect(spinVideoProblem(big)).toMatch(/200 MB/);
  });

  it("sends the video with purpose yacht_spin_video and its real type", async () => {
    vi.resetModules();
    const session = await import("@/services/admin/admin-session");
    session.saveTokens({ access_token: "a", refresh_token: "r", expires_in: 900 });
    const media = await import("@/services/admin/media.service");
    stub(() =>
      json({ media_id: "m-9", upload_url: "https://storage.test/put", expires_in: 900 }, 201),
    );
    const puts: { url: string; type: string | null }[] = [];
    class FakeXhr {
      upload = { onprogress: null };
      onload: (() => void) | null = null;
      status = 200;
      private url = "";
      private type: string | null = null;
      open(_: string, url: string) {
        this.url = url;
      }
      setRequestHeader(_: string, value: string) {
        this.type = value;
      }
      send() {
        puts.push({ url: this.url, type: this.type });
        this.onload?.();
      }
    }
    vi.stubGlobal("XMLHttpRequest", FakeXhr);
    expect(await media.uploadSpinVideo(file("turn.mov", ""))).toBe("m-9");
    expect(calls[0]?.body).toEqual({
      purpose: "yacht_spin_video",
      filename: "turn.mov",
      content_type: "video/quicktime",
      size_bytes: 1000,
    });
    expect(puts).toEqual([{ url: "https://storage.test/put", type: "video/quicktime" }]);
  });
});

describe("360° frame loading", () => {
  it("asks for the frame list once per view, and again only after it's dropped", async () => {
    const { frameList, forgetFrameList } = await import("@/lib/spin-frames");
    const fetchList = vi.fn(async () => ["https://cdn.test/f1.webp?sig=a"]);
    const [a, b] = await Promise.all([
      frameList("v1:large", fetchList),
      frameList("v1:large", fetchList),
    ]);
    expect(a).toBe(b);
    expect(fetchList).toHaveBeenCalledTimes(1);
    forgetFrameList("v1:large");
    await frameList("v1:large", fetchList);
    expect(fetchList).toHaveBeenCalledTimes(2);
  });

  it("never keeps a failed list, and knows a re-signed link is the same frame", async () => {
    const { frameList, frameId } = await import("@/lib/spin-frames");
    const failing = vi.fn(async (): Promise<string[]> => {
      throw new Error("offline");
    });
    await expect(frameList("v2:small", failing)).rejects.toThrow("offline");
    const working = vi.fn(async () => ["x"]);
    expect(await frameList("v2:small", working)).toEqual(["x"]);
    expect(frameId("https://cdn.test/spin/f1.webp?X-Amz-Signature=aaa")).toBe(
      frameId("https://cdn.test/spin/f1.webp?X-Amz-Signature=bbb"),
    );
  });
});
