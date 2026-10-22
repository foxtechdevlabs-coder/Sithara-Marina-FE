import { expect, test } from "@playwright/test";

test("baseline security headers are sent and the framework is not advertised", async ({
  request,
}) => {
  for (const path of ["/", "/admin/dashboard", "/does-not-exist"]) {
    const headers = (await request.get(path)).headers();
    expect(headers["x-content-type-options"], path).toBe("nosniff");
    expect(headers["x-frame-options"], path).toBe("DENY");
    expect(headers["referrer-policy"], path).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"], path).toContain("camera=()");
    expect(headers["x-powered-by"], path).toBeUndefined();
  }
});
