import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/services/user/auth.service";

export const PASSWORD_REQUIRED_MESSAGE = "Choose a password.";
export const PASSWORD_LENGTH_MESSAGE = `Use between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters.`;
export const PASSWORD_COMBINATION_MESSAGE =
  "Include at least one letter, one number and one special character (for example @, # or !).";

/** A letter from any alphabet, upper or lower case. */
const HAS_LETTER = /\p{L}/u;
const HAS_NUMBER = /[0-9]/;
/** Anything that isn't a letter, a digit or a space: @ # ! _ - . etc. */
const HAS_SPECIAL = /[^\p{L}\p{N}\s]/u;

/** True when the password has a letter, a number and a special character. */
export function hasRequiredPasswordCharacters(password: string): boolean {
  return HAS_LETTER.test(password) && HAS_NUMBER.test(password) && HAS_SPECIAL.test(password);
}

/**
 * What's wrong with a new account's password, or null when it's acceptable.
 * Length is the backend's documented 8–128 (POST /auth/register); the backend
 * also refuses common or easy-to-guess passwords, which only it can judge.
 */
export function registrationPasswordProblem(password: string): string | null {
  if (!password) return PASSWORD_REQUIRED_MESSAGE;
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH)
    return PASSWORD_LENGTH_MESSAGE;
  if (!hasRequiredPasswordCharacters(password)) return PASSWORD_COMBINATION_MESSAGE;
  return null;
}
