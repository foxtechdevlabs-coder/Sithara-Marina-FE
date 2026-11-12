import type { Metadata } from "next";

import { userRoutes } from "@/constants/routes";
import { CheckoutSignInPage } from "@/features/user/auth/components/checkout-sign-in-page";
import { SignInPage } from "@/features/user/auth/components/sign-in-page";

export const metadata: Metadata = { title: "Sign in" };

/** Sign in; from checkout (`?next=/checkout`) it keeps the chosen charter in view. */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  return next === userRoutes.checkout ? <CheckoutSignInPage /> : <SignInPage />;
}
