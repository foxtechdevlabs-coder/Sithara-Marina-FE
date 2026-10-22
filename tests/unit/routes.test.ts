import { describe, expect, it } from "vitest";

import { adminRoutes, userRoutes } from "@/constants/routes";

function allPaths(routes: Record<string, string | ((id: string) => string)>): string[] {
  return Object.values(routes).map((route) => (typeof route === "function" ? route("x") : route));
}

describe("route builders", () => {
  it("keeps every admin route under /admin (migration regression)", () => {
    for (const path of allPaths(adminRoutes)) expect(path).toMatch(/^\/admin(\/|$)/);
  });

  it("keeps every user route outside /admin", () => {
    for (const path of allPaths(userRoutes)) expect(path).not.toMatch(/^\/admin(\/|$)/);
  });

  it("URL-encodes dynamic segments", () => {
    expect(userRoutes.yacht("a b/c")).toBe("/yachts/a%20b%2Fc");
    expect(adminRoutes.fleetYachtPricing("y 1")).toBe("/admin/fleet/y%201/pricing");
  });
});
