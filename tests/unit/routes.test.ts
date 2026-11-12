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

  it("opens the custom quote page with the yacht and, when given, the guest count", () => {
    expect(userRoutes.planCharterFor("astra-one")).toBe("/plan-your-charter?yacht=astra-one");
    expect(userRoutes.planCharterFor("astra-one", "id-1")).toBe(
      "/plan-your-charter?yacht=astra-one&yacht_id=id-1",
    );
    expect(userRoutes.planCharterFor("astra-one", "id-1", "4")).toBe(
      "/plan-your-charter?yacht=astra-one&yacht_id=id-1&guests=4",
    );
    expect(new URL(userRoutes.planCharterFor("a b&c"), "https://x.test").searchParams.get("yacht")).toBe(
      "a b&c",
    );
  });
});
