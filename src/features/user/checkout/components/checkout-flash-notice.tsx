"use client";

import { useEffect, useState } from "react";

import { consumeCheckoutFlash } from "../utils/checkout-flash";
import { Notice } from "./checkout-ui";

/** Shows (once) the message the checkout left when it sent the customer back here. */
export function CheckoutFlashNotice() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    // Read after hydration: sessionStorage doesn't exist on the server.
    const flash = consumeCheckoutFlash();
    if (flash) setMessage(flash);
  }, []);

  return message ? <Notice alert>{message}</Notice> : null;
}
