/**
 * A link that opens Gmail's compose window in the browser, addressed to `to`.
 * A mailto: link only opens something when the computer has a mail app set up,
 * so it can look like the click did nothing.
 */
export function gmailComposeUrl(to: string, extra: { subject?: string; body?: string } = {}): string {
  const query = new URLSearchParams({ view: "cm", fs: "1", to: to.trim() });
  if (extra.subject) query.set("su", extra.subject);
  if (extra.body) query.set("body", extra.body);
  return `https://mail.google.com/mail/?${query.toString()}`;
}
