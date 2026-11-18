import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { signInRedirectFor } from "@/features/user/account/utils/sign-in-redirect";
import {
  PENDING_EMAIL_CHANGE_MAX_AGE_MS,
  savePendingEmailChangeToken,
  takePendingEmailChangeToken,
} from "@/features/user/profile/utils/pending-email-change";

// Issue 5 (audit): an email-change link opened while signed out lost its token
// (and `?email=`) on the way through sign-in.

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

beforeEach(() => {
  vi.stubGlobal("sessionStorage", memoryStorage());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("signInRedirectFor", () => {
  it("returns to the same page", () => {
    expect(signInRedirectFor("/account/profile", "")).toBe("/login?next=%2Faccount%2Fprofile");
  });

  it("keeps the query string", () => {
    expect(signInRedirectFor("/account/profile/email", "?email=new%40example.test")).toBe(
      `/login?next=${encodeURIComponent("/account/profile/email?email=new%40example.test")}`,
    );
  });

  it("ignores an empty query", () => {
    expect(signInRedirectFor("/account/profile", "?")).toBe("/login?next=%2Faccount%2Fprofile");
  });

  it("never turns into an external redirect", () => {
    expect(signInRedirectFor("//evil.example", "")).toBe("/login?next=%2Faccount");
  });
});

describe("pending email-change token", () => {
  it("is handed over once, after sign-in", () => {
    savePendingEmailChangeToken("id.secret");
    expect(takePendingEmailChangeToken()).toBe("id.secret");
    expect(takePendingEmailChangeToken()).toBeNull();
  });

  it("is dropped when too old", () => {
    const savedAt = 1_000_000;
    savePendingEmailChangeToken("id.secret", savedAt);
    expect(takePendingEmailChangeToken(savedAt + PENDING_EMAIL_CHANGE_MAX_AGE_MS + 1)).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });

  it("is still used within its time limit", () => {
    const savedAt = 1_000_000;
    savePendingEmailChangeToken("id.secret", savedAt);
    expect(takePendingEmailChangeToken(savedAt + PENDING_EMAIL_CHANGE_MAX_AGE_MS)).toBe(
      "id.secret",
    );
  });

  it("ignores a damaged entry", () => {
    sessionStorage.setItem("sithara-marina:pending-email-change", "{not json");
    expect(takePendingEmailChangeToken()).toBeNull();
  });
});
