import { ApiError } from "./api-error";

/**
 * Reads the Sithara backend's error bodies. Two shapes were observed on the
 * hosted backend (the Swagger spec does not define them):
 *
 * - Domain errors:     `{ statusCode, code: "INVALID_TOKEN", message: "…" }`
 * - Validation errors: `{ statusCode: 400, error: "Bad Request", message: ["…", "…"] }`
 */
export interface BackendErrorDetails {
  /** Machine-readable code such as `EMAIL_EXISTS`, when the body has one. */
  code: string | undefined;
  /** Message(s) from the body; for validation errors, one per failed rule. */
  messages: string[];
}

export function getBackendErrorDetails(error: unknown): BackendErrorDetails {
  const body = error instanceof ApiError ? error.body : undefined;
  if (!body || typeof body !== "object") return { code: undefined, messages: [] };

  const record = body as Record<string, unknown>;
  const code = typeof record.code === "string" ? record.code : undefined;
  const message = record.message;
  const messages = Array.isArray(message)
    ? message.filter((item): item is string => typeof item === "string")
    : typeof message === "string"
      ? [message]
      : [];

  return { code, messages };
}
