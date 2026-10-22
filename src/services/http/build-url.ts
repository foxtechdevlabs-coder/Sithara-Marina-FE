import type { QueryParams } from "./types";

/**
 * Joins a base URL and a path, and appends query parameters.
 *
 * `buildUrl("http://localhost:4000/api/", "/yachts", { page: 2 })`
 *   -> "http://localhost:4000/api/yachts?page=2"
 */
export function buildUrl(baseUrl: string, path: string, query?: QueryParams): string {
  const url = `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;

  if (!query) return url;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    const values = Array.isArray(value) ? value : [value];
    for (const item of values) {
      if (item !== null && item !== undefined) params.append(key, String(item));
    }
  }

  const search = params.toString();
  return search ? `${url}?${search}` : url;
}
