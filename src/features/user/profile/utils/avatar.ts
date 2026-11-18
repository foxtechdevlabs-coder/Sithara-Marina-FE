import type { AccountUser } from "@/services/user/profile.service";

/**
 * A functional update that sets only `avatar_url`. Applied to the newest data
 * when the photo request finishes, not to the copy taken when it started, so a
 * profile saved meanwhile (name, phone) is kept.
 */
export function withAvatarUrl<T extends { user: AccountUser }>(avatarUrl: string | null) {
  return (current: T): T => ({ ...current, user: { ...current.user, avatar_url: avatarUrl } });
}
