import type { ReactNode } from "react";

import { AuthSessionHandlers } from "@/features/user/auth/components/auth-session-handlers";

/**
 * User-area root. Adds no markup: it only makes sure the customer session is
 * connected to the shared HTTP client on every customer page.
 */
export default function UserAreaLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <AuthSessionHandlers />
    </>
  );
}
