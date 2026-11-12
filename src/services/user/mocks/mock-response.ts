import type { z } from "zod";

import { ApiError } from "@/services/http/api-error";

/*
 * Stand-in for `apiClient` while the customer-account endpoints are not yet
 * published by the NestJS backend. Each mock answer goes through the same Zod
 * schema the real response will, so swapping a service body for an
 * `apiClient` call changes nothing for the components.
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

/** Rejects like a backend error response with `status` and `code`. */
export async function mockError(
  status: number,
  code: string,
  message: string,
  signal?: AbortSignal,
): Promise<never> {
  await delay(signal);
  throw new ApiError(message, {
    kind: "http",
    status,
    body: { statusCode: status, code, message },
  });
}

/** Rejects like the backend's 404 for a record that is missing or not this customer's. */
export function mockNotFound(code: string, signal?: AbortSignal): Promise<never> {
  return mockError(404, code, "Not found", signal);
}
