import { describe, expect, it } from "vitest";

import { gmailComposeUrl } from "@/lib/gmail-compose";

describe("gmailComposeUrl", () => {
  it("opens Gmail's full-screen compose window addressed to the recipient", () => {
    const url = new URL(gmailComposeUrl("sitharamarina@gmail.com"));
    expect(url.origin + url.pathname).toBe("https://mail.google.com/mail/");
    expect(url.searchParams.get("view")).toBe("cm");
    expect(url.searchParams.get("fs")).toBe("1");
    expect(url.searchParams.get("to")).toBe("sitharamarina@gmail.com");
    expect(url.searchParams.has("su")).toBe(false);
    expect(url.searchParams.has("body")).toBe(false);
  });

  it("trims the address and encodes an optional subject and body", () => {
    const url = new URL(
      gmailComposeUrl("  concierge@example.com ", { subject: "Charter & menus", body: "Hi,\n\n" }),
    );
    expect(url.searchParams.get("to")).toBe("concierge@example.com");
    expect(url.searchParams.get("su")).toBe("Charter & menus");
    expect(url.searchParams.get("body")).toBe("Hi,\n\n");
  });
});
