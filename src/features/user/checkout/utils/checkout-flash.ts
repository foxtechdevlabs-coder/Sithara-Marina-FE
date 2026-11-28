/**
 * One-time message shown on a yacht's availability page after the checkout
 * sent the customer back there (e.g. their time to pay ended). Kept in this
 * tab's sessionStorage so it survives the navigation, then read once and
 * removed. Never holds sensitive data.
 */
const STORAGE_KEY = "sithara-marina:checkout-flash";

export function saveCheckoutFlash(message: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, message);
  } catch {
    // Storage unavailable: the message is simply not shown.
  }
}

export function consumeCheckoutFlash(): string | null {
  try {
    const message = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    return message;
  } catch {
    return null;
  }
}
