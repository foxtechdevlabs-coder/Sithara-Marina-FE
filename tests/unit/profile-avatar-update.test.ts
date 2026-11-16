import { describe, expect, it } from "vitest";

import { withAvatarUrl } from "@/features/user/profile/utils/avatar";

// Issue 4 (audit): the new photo used to be applied to the profile as it was
// when the upload started, undoing a name or phone saved meanwhile.

const user = {
  id: "u-1",
  fullName: "Ajin Raj",
  email: "ajin@example.test",
  phone: null as string | null,
  role: "customer" as const,
  avatar_url: null as string | null,
};

describe("withAvatarUrl", () => {
  it("keeps a profile saved while the photo was uploading", () => {
    const savedDuringUpload = {
      user: { ...user, fullName: "Ajin R.", phone: "+919876543210" },
      extras: { country: "India" },
    };

    const next =
      withAvatarUrl<typeof savedDuringUpload>("https://cdn.test/a.webp")(savedDuringUpload);

    expect(next.user).toMatchObject({
      fullName: "Ajin R.",
      phone: "+919876543210",
      avatar_url: "https://cdn.test/a.webp",
    });
    expect(next.extras).toEqual({ country: "India" });
  });

  it("removes the photo without touching anything else", () => {
    const current = { user: { ...user, avatar_url: "https://cdn.test/old.webp" } };
    expect(withAvatarUrl<typeof current>(null)(current).user).toEqual({
      ...user,
      avatar_url: null,
    });
  });

  it("does not change the object it is given", () => {
    const current = { user: { ...user } };
    withAvatarUrl<typeof current>("https://cdn.test/a.webp")(current);
    expect(current.user.avatar_url).toBeNull();
  });
});
