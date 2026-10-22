import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

// Area boundaries: the user and admin areas must not depend on each other, and
// shared code must not depend on either area.
const userAreaModules = [
  "@/features/user/*",
  "@/components/user/*",
  "@/services/user/*",
  "@/config/user-navigation",
];
const adminAreaModules = [
  "@/features/admin/*",
  "@/components/admin/*",
  "@/services/admin/*",
  "@/config/admin-navigation",
];

const restrictImports = (group, message) => ({
  "no-restricted-imports": ["error", { patterns: [{ group, message }] }],
});

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: [
      "src/app/(user)/**",
      "src/features/user/**",
      "src/components/user/**",
      "src/services/user/**",
      "src/config/user-navigation.ts",
    ],
    rules: restrictImports(adminAreaModules, "User-area code must not import admin-area modules."),
  },
  {
    files: [
      "src/app/admin/**",
      "src/features/admin/**",
      "src/components/admin/**",
      "src/services/admin/**",
      "src/config/admin-navigation.ts",
    ],
    rules: restrictImports(userAreaModules, "Admin-area code must not import user-area modules."),
  },
  {
    files: [
      "src/components/ui/**",
      "src/components/shared/**",
      "src/lib/**",
      "src/services/http/**",
      "src/validation/**",
      "src/types/**",
      "src/hooks/**",
      "src/constants/**",
      "src/config/env.ts",
    ],
    rules: restrictImports(
      [...userAreaModules, ...adminAreaModules],
      "Shared code must not depend on the user or admin area.",
    ),
  },
  prettier,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
  ]),
]);
