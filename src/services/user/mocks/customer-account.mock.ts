/*
 * TEMPORARY mock data for the account features the backend has no endpoint for
 * yet (see docs/missing-customer-apis.md). Everything else in the account area
 * calls the real API. Import only from `src/services/user`.
 */

/** Profile fields `PATCH /me` does not accept (it takes `name` and `phone` only). */
export const MOCK_PROFILE_EXTRAS = {
  country: "India" as string | null,
  billing: {
    address: null as string | null,
    city: null as string | null,
    state: null as string | null,
    postal_code: null as string | null,
  },
};

/** No notification-preference endpoint exists. */
export const MOCK_NOTIFICATION_PREFERENCES = {
  proposal_emails: true,
  whatsapp_updates: false,
  stories_and_offers: false,
};
