export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

/** What's wrong with a new password and its confirmation, or "" if they're fine. */
export function passwordProblem(password: string, confirmation: string) {
  if (!password) return "Enter a password.";
  if (password.length < PASSWORD_MIN) {
    return `Use at least ${PASSWORD_MIN} characters.`;
  }
  if (password.length > PASSWORD_MAX) return `Use ${PASSWORD_MAX} characters or fewer.`;
  if (!confirmation) return "Confirm your password.";
  if (password !== confirmation) return "The two passwords don't match.";
  return "";
}
