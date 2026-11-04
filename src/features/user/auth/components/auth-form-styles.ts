/**
 * Shared look of the account forms (sign in, create account). Sizes from `lg`
 * use the page's `--r` / `--rw` scale (1728px-reference pixels).
 */

/** Same light-to-blue gradient as the yacht page's enquiry button. */
export const PRIMARY_GRADIENT = "linear-gradient(90deg, #f4f8fd 0%, #cfe2f8 45%, #69aef0 100%)";

export const inputClass =
  "h-[3.625rem] w-full border border-[#d6d9dc] bg-white px-4 text-[1rem] text-[#0d1b2a] outline-none placeholder:text-[#0d1b2a]/70 focus:border-[#0d1b2a] aria-[invalid=true]:border-[#b42318] lg:h-[calc(var(--r)*58)] lg:min-h-12";

export const labelClass = "block text-[0.75rem] leading-none text-[#3d434a]";

export const fieldErrorClass = "mt-2 text-[0.8125rem] text-[#b42318]";

export const formAlertClass =
  "mt-6 max-w-[35rem] border-l-2 border-[#b42318] pl-3 text-[0.875rem] leading-snug text-[#3d434a]";

/** Gradient submit button; pair with `style={{ background: PRIMARY_GRADIENT }}`. */
export const primaryButtonClass =
  "inline-flex h-[3.4375rem] items-center justify-center gap-2 px-6 text-[0.8125rem] text-[#0d1b2a] transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0d1b2a] disabled:cursor-wait disabled:opacity-60 lg:h-[max(calc(var(--r)*55),2.75rem)]";

/** White, thin-navy-bordered secondary link. */
export const secondaryButtonClass =
  "flex h-[3.4375rem] items-center justify-center border border-[#0d1b2a] px-4 text-center text-[0.8125rem] text-[#0d1b2a] transition-colors hover:bg-[#0d1b2a] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0d1b2a] lg:h-[max(calc(var(--r)*55),2.75rem)]";
