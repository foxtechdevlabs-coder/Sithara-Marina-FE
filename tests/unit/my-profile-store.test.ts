import { beforeEach, describe, expect, it, vi } from "vitest";

// Issue 6 (audit): the page and the account sidebar share one GET /auth/me,
// and saved changes reach the sidebar without another request.

const getMyProfile = vi.fn();
vi.mock("@/services/user/profile.service", () => ({ getMyProfile }));

const user = (fullName: string) => ({
  id: "u-1",
  fullName,
  email: "ajin@example.test",
  phone: null,
  role: "customer" as const,
  avatar_url: null,
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

beforeEach(() => {
  vi.resetModules();
  getMyProfile.mockReset();
});

const store = () => import("@/features/user/account/my-profile");

describe("my-profile store", () => {
  it("shares one GET /auth/me between callers starting together", async () => {
    getMyProfile.mockResolvedValue(user("Ajin Raj"));
    const { fetchMyProfile, readMyProfile } = await store();

    const [page, sidebar] = await Promise.all([fetchMyProfile(), fetchMyProfile()]);

    expect(getMyProfile).toHaveBeenCalledTimes(1);
    expect(page).toBe(sidebar);
    expect(readMyProfile()?.fullName).toBe("Ajin Raj");
  });

  it("asks again once the previous request has finished", async () => {
    getMyProfile.mockResolvedValue(user("Ajin Raj"));
    const { fetchMyProfile } = await store();

    await fetchMyProfile();
    await fetchMyProfile();

    expect(getMyProfile).toHaveBeenCalledTimes(2);
  });

  it("lets a failed request be retried", async () => {
    getMyProfile.mockRejectedValueOnce(new Error("offline"));
    getMyProfile.mockResolvedValueOnce(user("Ajin Raj"));
    const { fetchMyProfile } = await store();

    await expect(fetchMyProfile()).rejects.toThrow("offline");
    await expect(fetchMyProfile()).resolves.toMatchObject({ fullName: "Ajin Raj" });
  });

  it("notifies subscribers of saved changes and photo updates", async () => {
    const { publishMyProfile, updatePublishedProfile, readMyProfile } = await store();

    publishMyProfile(user("Ajin Raj"));
    updatePublishedProfile((current) => ({ ...current, avatar_url: "https://cdn.test/a.webp" }));

    expect(readMyProfile()).toMatchObject({
      fullName: "Ajin Raj",
      avatar_url: "https://cdn.test/a.webp",
    });
    expect(getMyProfile).not.toHaveBeenCalled();
  });

  it("drops an answer for the previous customer after being cleared", async () => {
    const pending = deferred<ReturnType<typeof user>>();
    getMyProfile.mockReturnValueOnce(pending.promise);
    const { fetchMyProfile, clearMyProfile, readMyProfile } = await store();

    const request = fetchMyProfile();
    clearMyProfile(); // signed out while it was on its way
    pending.resolve(user("Previous customer"));
    await request;

    expect(readMyProfile()).toBeNull();
  });
});
