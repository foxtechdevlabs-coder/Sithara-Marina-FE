import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginPage() {
  return (
    <RoutePlaceholder
      title="Sign in"
      description="Customer sign-in. Feature module: features/user/auth."
    />
  );
}
