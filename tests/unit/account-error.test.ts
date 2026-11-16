import { describe, expect, it } from "vitest";

import {
  accountErrorMessage,
  VALIDATION_ERROR_MESSAGE,
} from "@/features/user/account/utils/account-error";
import { ApiError } from "@/services/http/api-error";

// Issue 3 (audit): a 400 validation error used to fall back to "We couldn't
// save … just now. Please try again.", which retrying cannot fix.

const FALLBACK = "We couldn’t save your details just now. Please try again.";

const httpError = (status: number, body: unknown, headers?: HeadersInit) =>
  new ApiError(`Request failed (${status})`, {
    kind: "http",
    status,
    body,
    headers: new Headers(headers),
  });

describe("accountErrorMessage", () => {
  it("asks the customer to check their input for a 400 validation error", () => {
    const error = httpError(400, {
      statusCode: 400,
      error: "Bad Request",
      message: ["name must be shorter than or equal to 255 characters"],
    });
    expect(accountErrorMessage(error, FALLBACK)).toBe(VALIDATION_ERROR_MESSAGE);
  });

  it("never shows the raw server message", () => {
    const error = httpError(400, { statusCode: 400, message: "property email should not exist" });
    expect(accountErrorMessage(error, FALLBACK)).not.toContain("property email");
  });

  it("prefers a documented code's message over the generic 400 one", () => {
    const error = httpError(400, { statusCode: 400, code: "EMAIL_UNCHANGED", message: "…" });
    expect(
      accountErrorMessage(error, FALLBACK, {
        EMAIL_UNCHANGED: "This is already your account email.",
      }),
    ).toBe("This is already your account email.");
  });

  it("keeps the fallback for server errors, which a retry may fix", () => {
    expect(accountErrorMessage(httpError(500, {}), FALLBACK)).toBe(FALLBACK);
  });

  it("keeps the connection and rate-limit messages", () => {
    const offline = new ApiError("Network error", { kind: "network" });
    expect(accountErrorMessage(offline, FALLBACK)).toMatch(/couldn’t reach/);
    expect(accountErrorMessage(httpError(429, {}), FALLBACK)).toMatch(/Too many attempts/);
  });
});
