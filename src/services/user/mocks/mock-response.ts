import type { z } from "zod";

import { ApiError } from "@/services/http/api-error";

/*
 * TEMPORARY stand-in for `apiClient`, used only by the account features the
 * backend has no endpoint for yet (see docs/missing-customer-apis.md). Each
 * mock answer goes through the schema the real response will, so swapping it
 * for an `apiClient` call changes nothing for the components.
 */

/** Short, so loading states are visible without slowing the pages down. */
const MOCK_LATENCY_MS = 150;

function delay(signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new ApiError("Request aborted", { kind: "aborted" }));
      return;
    }
    const timer = setTimeout(resolve, MOCK_LATENCY_MS);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new ApiError("Request aborted", { kind: "aborted" }));
      },
      { once: true },
    );
  });
}

/** Resolves `data`, validated with `schema`, like a 2xx response. */
export async function mockResponse<S extends z.ZodType>(
  schema: S,
  data: unknown,
  signal?: AbortSignal,
): Promise<z.infer<S>> {
  await delay(signal);
  return schema.parse(structuredClone(data));
}
