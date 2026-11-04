import type {
  BookingMode,
  Ownership,
  Yacht,
  YachtInput,
  YachtPatch,
} from "@/services/admin/fleet.service";

/**
 * The add/edit yacht form's state, and its mapping to the backend contract
 * (CreateYachtDto / UpdateYachtDto). Text inputs keep strings; conversion and
 * validation follow the backend's rules.
 */
export interface YachtFormState {
  name: string;
  slug: string;
  type: string;
  departureCity: string;
  departurePoints: string[];
  ownership: Ownership;
  partnerId: string;
  /** Metres on the form; the API stores whole feet (`length_ft`). */
  length: string;
  capacity: string;
  suites: string;
  description: string;
  amenities: string[];
  inclusions: string[];
  policies: string;
  /** The form's three booking options; see `MODE_FIELDS`. */
  mode: "instant" | "slots" | "enquiry";
  visible: boolean;
  featured: boolean;
}

/** Booking option → booking_mode + enquiry_enabled. */
export const MODE_FIELDS: Record<
  YachtFormState["mode"],
  { booking_mode: BookingMode; enquiry_enabled: boolean }
> = {
  instant: { booking_mode: "instant", enquiry_enabled: false },
  slots: { booking_mode: "instant", enquiry_enabled: true },
  enquiry: { booking_mode: "enquiry_only", enquiry_enabled: true },
};

export const EMPTY_FORM: YachtFormState = {
  name: "",
  slug: "",
  type: "",
  departureCity: "",
  departurePoints: [],
  ownership: "own",
  partnerId: "",
  length: "",
  capacity: "",
  suites: "",
  description: "",
  amenities: [],
  inclusions: [],
  policies: "",
  mode: "instant",
  // New yachts must start hidden (the backend refuses a visible new yacht).
  visible: false,
  featured: false,
};

const text = (value: string | null) => value ?? "";
const num = (value: number | null) => (value === null ? "" : String(value));

export function formFromYacht(yacht: Yacht): YachtFormState {
  return {
    name: yacht.name,
    slug: yacht.slug,
    type: text(yacht.type),
    departureCity: text(yacht.departure_city),
    departurePoints: [...yacht.departure_points],
    ownership: yacht.ownership_type,
    partnerId: yacht.partner?.id ?? "",
    length: yacht.length_ft === null ? "" : String(feetToMetres(yacht.length_ft)),
    capacity: String(yacht.capacity),
    suites: num(yacht.suites),
    description: text(yacht.description),
    amenities: [...yacht.amenities],
    inclusions: [...yacht.inclusions],
    policies: text(yacht.policies),
    mode:
      yacht.booking_mode === "enquiry_only"
        ? "enquiry"
        : yacht.enquiry_enabled
          ? "slots"
          : "instant",
    visible: yacht.is_visible,
    featured: yacht.is_featured,
  };
}

/** "Duplicate as new yacht": same details, new name, no slug, hidden. */
export function formFromTemplate(yacht: Yacht): YachtFormState {
  return {
    ...formFromYacht(yacht),
    name: `${yacht.name} (copy)`.slice(0, 100),
    slug: "",
    visible: false,
    featured: false,
  };
}

const FEET_PER_METRE = 3.28084;
/** Metres → whole feet, as `length_ft` stores it. */
export const metresToFeet = (metres: number) => Math.round(metres * FEET_PER_METRE);
/** Feet → whole metres, for the form. */
export const feetToMetres = (feet: number) => Math.round(feet / FEET_PER_METRE);

const trimmedOrNull = (value: string) => (value.trim() === "" ? null : value.trim());
const intOrNull = (value: string) => (value.trim() === "" ? null : Number(value));

/** Every field the form edits, as the backend expects it (empty → null). */
function fieldsOf(form: YachtFormState) {
  return {
    name: form.name.trim(),
    ownership_type: form.ownership,
    partner_id: form.ownership === "partner" ? form.partnerId || null : null,
    capacity: Number(form.capacity),
    type: trimmedOrNull(form.type),
    length_ft: form.length.trim() === "" ? null : metresToFeet(Number(form.length)),
    suites: intOrNull(form.suites),
    description: form.description.trim() === "" ? null : form.description,
    departure_city: trimmedOrNull(form.departureCity),
    departure_points: form.departurePoints,
    amenities: form.amenities,
    inclusions: form.inclusions,
    policies: form.policies.trim() === "" ? null : form.policies,
    ...MODE_FIELDS[form.mode],
    is_featured: form.featured,
    is_visible: form.visible,
  };
}

/** POST /admin/yachts body: required fields plus the optional ones that are filled in. */
export function toCreateInput(form: YachtFormState): YachtInput {
  // A new yacht is always created hidden, so `is_visible` is left to the default.
  const fields = fieldsOf(form);
  const input: YachtInput = {
    name: fields.name,
    ownership_type: fields.ownership_type,
    capacity: fields.capacity,
  };
  if (form.slug.trim()) input.slug = form.slug.trim();
  if (fields.ownership_type === "partner" && fields.partner_id)
    input.partner_id = fields.partner_id;
  if (fields.type !== null) input.type = fields.type;
  if (fields.length_ft !== null) input.length_ft = fields.length_ft;
  if (fields.suites !== null) input.suites = fields.suites;
  if (fields.description !== null) input.description = fields.description;
  if (fields.departure_city !== null) input.departure_city = fields.departure_city;
  if (fields.policies !== null) input.policies = fields.policies;
  for (const key of ["departure_points", "amenities", "inclusions"] as const) {
    if (fields[key].length) input[key] = fields[key];
  }
  input.booking_mode = fields.booking_mode;
  input.enquiry_enabled = fields.enquiry_enabled;
  if (fields.is_featured) input.is_featured = true;
  return input;
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** PATCH /admin/yachts/{id} body: only the fields that differ from the saved yacht. */
export function toPatch(form: YachtFormState, saved: Yacht): YachtPatch {
  const next = fieldsOf(form);
  const before = fieldsOf(formFromYacht(saved));
  const patch: Record<string, unknown> = {};
  for (const key of Object.keys(next) as (keyof typeof next)[]) {
    if (!same(next[key], before[key])) patch[key] = next[key];
  }
  // Switching to "own" clears the partner on the server; partner_id is not allowed then.
  if (next.ownership_type === "own") delete patch.partner_id;
  if (form.slug.trim() !== saved.slug) patch.slug = form.slug.trim();
  return patch as YachtPatch;
}

/** Lowercase words joined by single hyphens, e.g. "azure-52" (backend SLUG rule). */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const intIn = (value: string, min: number, max: number) => {
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max;
};

/**
 * Field errors keyed by input id, following the backend validation rules.
 * `editing` requires a slug (it can be changed, not cleared).
 */
export function validateYachtForm(form: YachtFormState, editing: boolean): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.name.trim()) errors["yacht-name"] = "Enter the yacht's name.";
  else if (form.name.trim().length > 100) errors["yacht-name"] = "Use 100 characters or fewer.";

  const slug = form.slug.trim();
  if (editing && !slug) errors["slug"] = "Enter a URL name.";
  else if (slug && (!SLUG.test(slug) || slug.length > 100))
    errors["slug"] = "Use lowercase letters and numbers joined by hyphens, e.g. azure-52.";

  if (form.type.trim().length > 100) errors["vessel-type"] = "Use 100 characters or fewer.";
  if (form.departureCity.trim().length > 100) errors["home-port"] = "Use 100 characters or fewer.";
  if (form.ownership === "partner" && !form.partnerId)
    errors["partner"] = "Choose the partner who owns this yacht.";

  if (!form.capacity) errors["capacity"] = "Enter the maximum number of guests.";
  else if (!intIn(form.capacity, 1, 1000))
    errors["capacity"] = "Enter a whole number from 1 to 1000.";
  // 1–1000 ft on the backend is 1–304 m.
  if (form.length && !intIn(form.length, 1, 304))
    errors["length"] = "Enter a whole number of metres, 1 to 304.";
  if (form.suites && !intIn(form.suites, 0, 50))
    errors["suites"] = "Enter a whole number from 0 to 50.";

  if (form.description.length > 10_000) errors["description"] = "Use 10,000 characters or fewer.";
  if (form.policies.length > 10_000) errors["policies"] = "Use 10,000 characters or fewer.";
  if (form.departurePoints.length > 20)
    errors["departure-points"] = "Add at most 20 departure points.";
  if (form.amenities.length > 100) errors["amenities"] = "Add at most 100 amenities.";
  if (form.inclusions.length > 100) errors["inclusions"] = "Add at most 100 inclusions.";
  return errors;
}

/** Longest item each list accepts (departure points 200, others 100). */
export const LIST_ITEM_MAX = { departurePoints: 200, amenities: 100, inclusions: 100 } as const;
