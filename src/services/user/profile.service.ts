import {
  customerProfileSchema,
  type CustomerProfile,
} from "@/features/user/profile/types/profile.schema";

/*
 * DUMMY data until the account API and authentication are ready. Replace the
 * body of `getProfile` with an `apiClient` call and keep the Zod parse so the
 * response shape is validated.
 */
const DUMMY_PROFILE = {
  fullName: "Ananya Menon",
  email: "ananya@example.com",
  phone: "+91 98765 43210",
  country: "India",
  billingAddress: "",
  city: "Kochi",
  state: "Kerala",
  postalCode: "",
  isEmailVerified: true,
  avatarUrl: null,
};

/** The signed-in customer's profile. */
export async function getProfile(): Promise<CustomerProfile> {
  return customerProfileSchema.parse(DUMMY_PROFILE);
}
