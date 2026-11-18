import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Issue 1 (audit): the TEMPORARY mock account details (country, billing,
// preferences) and the shared profile must never reach the next customer
// signed in on the same tab.

function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, String(value)),
  };
}

const tokens = (who: string) => ({ access_token: `${who}.a.b`, refresh_token: `${who}.r` });

beforeEach(() => {
  vi.resetModules();
  vi.stubGlobal("sessionStorage", memoryStorage());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

async function load() {
  const session = await import("@/features/user/auth/session");
  const profile = await import("@/services/user/profile.service");
  const store = await import("@/features/user/account/my-profile");
  return { session, profile, store };
}

const CUSTOMER_A = {
  id: "a",
  fullName: "Customer A",
  email: "a@example.test",
  phone: null,
  role: "customer" as const,
  avatar_url: null,
};

describe("customer-scoped data", () => {
  it("starts with no prefilled country or billing details", async () => {
    const { profile } = await load();
    const extras = await profile.getProfileExtras();
    expect(extras.country).toBeNull();
    expect(Object.values(extras.billing).every((value) => value === null)).toBe(true);
  });

  it("is cleared when the customer signs out", async () => {
    const { session, profile, store } = await load();
    session.saveAuthSession(tokens("a"));
    await profile.updateProfileExtras({
      country: "India",
      billing: { address: "1 Marine Drive", city: "Kochi", state: "Kerala", postal_code: "682001" },
    });
    await profile.updateNotificationPreferences({ stories_and_offers: true });
    store.publishMyProfile(CUSTOMER_A);

    session.clearAuthSession();

    expect(store.readMyProfile()).toBeNull();
    expect(sessionStorage.getItem("sithara-marina:mock-account:v2")).toBeNull();
    expect((await profile.getProfileExtras()).billing.address).toBeNull();
    expect((await profile.getNotificationPreferences()).stories_and_offers).toBe(false);
  });

  it("is cleared when another customer signs in on the same tab", async () => {
    const { session, profile, store } = await load();
    session.saveAuthSession(tokens("a"));
    await profile.updateProfileExtras({ country: "India" });
    store.publishMyProfile(CUSTOMER_A);

    session.saveAuthSession(tokens("b")); // e.g. signing in again without signing out

    expect(store.readMyProfile()).toBeNull();
    expect((await profile.getProfileExtras()).country).toBeNull();
  });

  it("is kept while the same customer's tokens are refreshed", async () => {
    const { session, profile } = await load();
    session.saveAuthSession(tokens("a"));
    await profile.updateProfileExtras({ country: "India" });

    session.replaceAccessToken("a.new.token"); // after POST /me/password

    expect((await profile.getProfileExtras()).country).toBe("India");
  });
});
