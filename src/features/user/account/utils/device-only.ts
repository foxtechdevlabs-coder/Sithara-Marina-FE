/*
 * TEMPORARY wording for the account details no backend endpoint stores yet
 * (country, billing details, notification preferences; see
 * docs/missing-customer-apis.md). They are kept in this browser tab only, so
 * the pages must never present them as saved to the account. Remove with the
 * mock store once the endpoints exist.
 */

export const DEVICE_ONLY_DETAILS_NOTE =
  "Country and billing details are kept in this browser tab only for now. They are not yet saved to your account, and are cleared when you sign out or close the tab.";

export const DEVICE_ONLY_PREFERENCES_NOTE =
  "These choices are kept in this browser tab only for now. They are not yet saved to your account, so our messages don’t follow them yet, and they are cleared when you sign out or close the tab.";
