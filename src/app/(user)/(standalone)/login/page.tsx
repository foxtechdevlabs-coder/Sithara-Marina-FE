import type { Metadata } from "next";

import { SignInPage } from "@/features/user/auth/components/sign-in-page";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return <SignInPage />;
}
