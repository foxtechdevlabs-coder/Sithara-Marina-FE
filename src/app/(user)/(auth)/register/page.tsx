import { RoutePlaceholder } from "@/components/shared/route-placeholder";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create an Account",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RegisterPage() {
  return (
    <RoutePlaceholder
      title="Create an account"
      description="Customer registration. Feature module: features/user/auth."
    />
  );
}
