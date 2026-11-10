import { getCustomer, listCustomers, type Customer } from "@/services/admin/customers.service";
import {
  getYacht,
  listYachts,
  type Yacht,
  type YachtListQuery,
} from "@/services/admin/fleet.service";
import { getPartner, listPartners, type Partner } from "@/services/admin/partners.service";

import type { SearchOption, SearchResult } from "./search-select";

/*
 * Option loaders for `SearchSelect`, on the existing list endpoints. Each
 * search asks the backend for one small page, so the field stays fast with
 * thousands of records.
 */

const PAGE = 20;

export const yachtOption = (y: Yacht): SearchOption<Yacht> => ({
  value: y.id,
  label: y.is_active ? y.name : `${y.name} (inactive)`,
  description: [
    y.partner?.name ?? (y.ownership_type === "own" ? "Own yacht" : null),
    y.capacity ? `${y.capacity} guests` : null,
  ]
    .filter(Boolean)
    .join(" · "),
  data: y,
});

/** Yachts by name or slug (GET /admin/yachts?search=). */
export function searchYachts(filter: Omit<YachtListQuery, "search" | "page" | "limit"> = {}) {
  return async (search: string, signal: AbortSignal): Promise<SearchResult<Yacht>> => {
    const list = await listYachts(
      { ...filter, limit: PAGE, ...(search ? { search: search.slice(0, 100) } : {}) },
      signal,
    );
    const items = [...list.items].sort(
      (a, b) => Number(b.is_active) - Number(a.is_active) || a.name.localeCompare(b.name),
    );
    return { options: items.map(yachtOption), hasMore: list.total > list.items.length };
  };
}

/** The label of a yacht id that isn't loaded yet (GET /admin/yachts/{id}). */
export async function resolveYacht(id: string, signal: AbortSignal) {
  return yachtOption(await getYacht(id, signal));
}

export const partnerOption = (p: Partner): SearchOption<Partner> => ({
  value: p.id,
  label: p.is_active ? p.name : `${p.name} (inactive)`,
  description: [p.contact_name, p.email].filter(Boolean).join(" · ") || undefined,
  data: p,
});

/** Partners by name, contact or email (GET /admin/partners?search=). */
export function searchPartners(filter: { status?: "active" | "inactive" } = {}) {
  return async (search: string, signal: AbortSignal): Promise<SearchResult<Partner>> => {
    const list = await listPartners(
      { ...filter, limit: PAGE, ...(search ? { search: search.slice(0, 100) } : {}) },
      signal,
    );
    return { options: list.items.map(partnerOption), hasMore: list.total > list.items.length };
  };
}

export async function resolvePartner(id: string, signal: AbortSignal) {
  return partnerOption(await getPartner(id, signal));
}

export const customerOption = (c: Customer): SearchOption<Customer> => ({
  value: c.id,
  label: c.full_name,
  description: [c.email, c.phone].filter(Boolean).join(" · "),
  data: c,
});

/** Customers by name, email or phone (GET /admin/customers?search=). */
export function searchCustomerRecords(filter: { status?: "active" | "inactive" } = {}) {
  return async (search: string, signal: AbortSignal): Promise<SearchResult<Customer>> => {
    const list = await listCustomers(
      { ...filter, limit: PAGE, sort: "name", ...(search ? { search: search.slice(0, 100) } : {}) },
      signal,
    );
    return { options: list.items.map(customerOption), hasMore: list.total > list.items.length };
  };
}

export async function resolveCustomer(id: string, signal: AbortSignal) {
  return customerOption(await getCustomer(id, signal));
}

/** Every active yacht as options, up to `limit` (the bulk endpoints take at most 100). */
export async function allActiveYachts(signal?: AbortSignal, limit = 100) {
  const list = await listYachts({ status: "active", limit }, signal);
  return { options: list.items.map(yachtOption), total: list.total };
}
