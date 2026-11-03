import type { Metadata } from "next";

import { SignUpPage } from "@/features/user/auth/components/sign-up-page";

export const metadata: Metadata = { title: "Create an account" };

export default function RegisterPage() {
  return <SignUpPage />;
}
