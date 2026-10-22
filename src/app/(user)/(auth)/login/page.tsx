import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <RoutePlaceholder
      title="Sign in"
      description="Customer sign-in. Feature module: features/user/auth."
    />
  );
}
