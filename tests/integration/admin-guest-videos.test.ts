import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Guest videos against a stubbed `fetch`, following the backend OpenAPI contract
// for /admin/guest-videos, /admin/media/uploads and /content/guest-videos.
const API = "http://api.test";
const video = {
  id: "v-1",
  title: "An evening with the Menon family",
  description: null,
  location: "Kochi",
  media_id: "m-1",
  video_url: "https://cdn.test/v.mp4",
  video_content_type: "video/mp4",
  video_size_bytes: 1024,
  video_filename: "menon.mp4",
  is_published: true,
  sort_order: 0,
  created_at: "2026-11-01T00:00:00.000Z",
  updated_at: "2026-11-01T00:00:00.000Z",
};

let calls: { url: string; method: string; body: unknown; auth: string | null; cache: unknown }[];
function stub(handler: (url: string, method: string) => { status?: number; body?: unknown }) {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const method = init.method ?? "GET";
      calls.push({
        url,
        method,
        body: typeof init.body === "string" ? JSON.parse(init.body) : undefined,
        auth: new Headers(init.headers).get("Authorization"),
        cache: init.cache,
      });
      const { status = 200, body } = handler(url, method);
      return status === 204
        ? new Response(null, { status })
        : new Response(JSON.stringify(body), {
            status,
            headers: { "Content-Type": "application/json" },
          });
    }),
  );
}

async function load() {
  vi.resetModules();
  const session = await import("@/services/admin/admin-session");
  session.saveTokens({ access_token: "access-1", refresh_token: "refresh-1", expires_in: 900 });
  return {
    admin: await import("@/services/admin/guest-videos.service"),
    media: await import("@/services/admin/media.service"),
    site: await import("@/services/user/content.service"),
  };
}

beforeEach(() => vi.stubEnv("NEXT_PUBLIC_API_URL", API));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("admin guest videos", () => {
  it("lists, reads, creates, updates and deletes with the admin token", async () => {
    const { admin } = await load();
    stub((url, method) =>
      method === "DELETE"
        ? { status: 204 }
        : url.includes("?")
          ? { body: { items: [video], total: 1, page: 2, limit: 20 } }
          : { body: video },
    );
    const list = await admin.listGuestVideos({ page: 2, limit: 20, status: "draft" });
    expect(list.items[0]?.title).toBe(video.title);
    await admin.getGuestVideo("v-1");
    await admin.createGuestVideo({
      title: "Hi",
      media_id: "m-1",
      is_published: false,
      sort_order: 0,
    });
    await admin.updateGuestVideo("v-1", { location: null });
    await admin.deleteGuestVideo("v-1");
    expect(calls.map((c) => [c.method, c.url.replace(API, ""), c.body])).toEqual([
      ["GET", "/admin/guest-videos?page=2&limit=20&status=draft", undefined],
      ["GET", "/admin/guest-videos/v-1", undefined],
      [
        "POST",
        "/admin/guest-videos",
        { title: "Hi", media_id: "m-1", is_published: false, sort_order: 0 },
      ],
      ["PATCH", "/admin/guest-videos/v-1", { location: null }],
      ["DELETE", "/admin/guest-videos/v-1", undefined],
    ]);
    expect(calls.every((c) => c.auth === "Bearer access-1")).toBe(true);
  });

  it("surfaces INCOMPLETE_CONTENT when publishing without a video", async () => {
    const { admin } = await load();
    stub(() => ({
      status: 400,
      body: { statusCode: 400, code: "INCOMPLETE_CONTENT", message: "x" },
    }));
    await expect(admin.createGuestVideo({ title: "Hi", is_published: true })).rejects.toMatchObject(
      {
        status: 400,
        code: "INCOMPLETE_CONTENT",
      },
    );
  });

  it("asks for a guest_video upload link with the file's type and size", async () => {
    const { media } = await load();
    stub(() => ({
      body: { media_id: "m-9", upload_url: "https://storage.test/put", expires_in: 900 },
    }));
    // The PUT to storage goes through XMLHttpRequest; succeed it straight away.
    const sent: { method: string; url: string; type: string | null }[] = [];
    class FakeXhr {
      status = 200;
      upload = { onprogress: null };
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      private headers: Record<string, string> = {};
      private target = { method: "", url: "" };
      open(method: string, url: string) {
        this.target = { method, url };
      }
      setRequestHeader(k: string, v: string) {
        this.headers[k] = v;
      }
      send() {
        sent.push({ ...this.target, type: this.headers["Content-Type"] ?? null });
        this.onload?.();
      }
    }
    vi.stubGlobal("XMLHttpRequest", FakeXhr);
    const file = new File(["abc"], "menon.webm", { type: "video/webm" });
    await expect(media.uploadGuestVideo(file)).resolves.toBe("m-9");
    expect(calls[0]?.body).toEqual({
      purpose: "guest_video",
      filename: "menon.webm",
      content_type: "video/webm",
      size_bytes: 3,
    });
    expect(sent).toEqual([{ method: "PUT", url: "https://storage.test/put", type: "video/webm" }]);
  });
});

describe("public guest videos", () => {
  it("reads published videos without a token and never from a cache", async () => {
    const { site } = await load();
    stub(() => ({
      body: { items: [{ ...video, video_url: null }], total: 1, page: 1, limit: 20 },
    }));
    const list = await site.listGuestVideos({ page: 1, limit: 20 });
    expect(calls[0]?.url).toBe(`${API}/content/guest-videos?page=1&limit=20`);
    expect(calls[0]?.auth).toBeNull();
    expect(calls[0]?.cache).toBe("no-store");
    expect(site.playableGuestVideos(list.items)).toEqual([]);
  });
});
