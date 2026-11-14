// Fake yacht API for local testing only: `node tests/e2e/support/mock-yacht-api.mjs`.
// Shapes follow the backend Swagger schemas. Every yacht here is invented test data
// ("Test Yacht …"); the app itself contains no fallback yachts.
import { createServer } from "node:http";

const PORT = Number(process.env.MOCK_API_PORT ?? 4010);
const TIMEZONE = "Asia/Kolkata";
const RETIRED_SLOT_TYPE = "00000000-0000-4000-8000-00000000dead";
const SLOT_TYPE = "00000000-0000-4000-8000-000000000001";
const GUEST_LIMIT = 10;

const pad = (value) => String(value).padStart(2, "0");

const card = (index) => ({
  id: `00000000-0000-4000-8000-1000000000${pad(index)}`,
  slug: `test-yacht-${pad(index)}`,
  name: `Test Yacht ${pad(index)}`,
  type: index % 2 ? "Motor yacht" : "Houseboat",
  length_ft: 92,
  suites: 4,
  capacity: 12,
  departure_city: index % 2 ? "Kochi" : "Alleppey",
  card_tagline: `Test tagline ${index}.`,
  cruising_regions: ["Test Region"],
  primary_image_url: "/images/home/about-mission.jpg",
  starting_price: 4_500_000 + index * 100_000,
  currency: "INR",
  available_on_date: null,
  booking_mode: "instant",
  enquiry_enabled: true,
});

/** A yacht with every nullable field empty. */
const SPARSE = {
  ...card(2),
  type: null,
  length_ft: null,
  suites: null,
  departure_city: null,
  card_tagline: null,
  cruising_regions: [],
  primary_image_url: null,
  starting_price: null,
  enquiry_enabled: false,
  booking_mode: "enquiry_only",
};

const FLEET = Array.from({ length: 22 }, (_, i) => (i === 1 ? SPARSE : card(i + 1)));

const detail = (yacht) =>
  yacht === SPARSE
    ? {
        ...SPARSE,
        description: null,
        built_year: null,
        refit_year: null,
        cruising_speed_kmh: null,
        departure_points: [],
        amenities: [],
        inclusions: [],
        crew: [],
        policies: null,
        photos: [],
        opens_at: null,
        closes_at: null,
        slot_types: [],
      }
    : {
        ...yacht,
        description: "Test description of this yacht.",
        built_year: 2015,
        refit_year: 2022,
        cruising_speed_kmh: 22,
        departure_points: ["Test Jetty A", "Test Jetty B"],
        amenities: ["Test amenity"],
        inclusions: ["Test inclusion"],
        crew: [{ name: "Test Captain", role: "Captain", bio: "Test biography." }],
        policies: "Test policy line one.\nTest policy line two.",
        photos: [
          { url: "/images/home/about-backwaters.png", sort_order: 2 },
          { url: "/images/home/about-mission.jpg", sort_order: 1 },
        ],
        opens_at: "08:00",
        closes_at: "20:00",
        slot_types: [
          { id: SLOT_TYPE, name: "Four hours", duration_minutes: 240, start_times: ["10:00"] },
          { id: RETIRED_SLOT_TYPE, name: "Retired length", duration_minutes: 60, start_times: [] },
        ],
      };

const calendar = (month) => {
  const [year, monthNumber] = month.split("-").map(Number);
  const length = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const status = (day) =>
    day === 1 ? "past" : day === 2 ? "unavailable" : day === 3 ? "partly_available" : "available";
  return {
    month,
    timezone: TIMEZONE,
    days: Array.from({ length }, (_, i) => ({
      date: `${month}-${pad(i + 1)}`,
      status: status(i + 1),
    })),
  };
};

const slots = (date, guests) => {
  const slot = (overrides) => ({
    slot_type_id: SLOT_TYPE,
    slot_type_name: "Four hours",
    start_time: "10:00",
    end_time: "14:00",
    starts_at: `${date}T04:30:00.000Z`, // 10:00 in Asia/Kolkata
    ends_at: `${date}T08:30:00.000Z`,
    state: "available",
    price: 4_500_000 + Math.max(0, guests - 8) * 200_000,
    included_guests: 8,
    extra_guest_amount: 200_000,
    ...overrides,
  });
  return {
    date,
    timezone: TIMEZONE,
    date_status: "available",
    currency: "INR",
    slots: [
      slot({}),
      slot({ slot_type_name: "No price rule", price: null }),
      slot({ slot_type_name: "Taken", state: "booked" }),
    ],
  };
};

const ADDONS = {
  currency: "INR",
  items: [
    {
      id: "00000000-0000-4000-8000-200000000001",
      name: "Test add-on",
      description: "Test add-on description.",
      price: 250_000,
      min_quantity: 1,
      max_quantity: 3,
    },
  ],
};

const FILTERS = {
  types: ["Motor yacht", "Houseboat"],
  destinations: ["Kochi", "Alleppey"],
  length_ft: { min: 60, max: 120 },
  suites: [2, 4],
  price: { min: 4_600_000, max: 6_700_000 },
  currency: "INR",
};

const error = (statusCode, code, message) => ({
  status: statusCode,
  body: { statusCode, code, message },
});

function listYachts(query) {
  if (query.get("type") === "broken") return error(500, undefined, "Test failure");
  if (query.get("date") === "2000-01-01") {
    return error(400, "INVALID_FILTER", "date must not be in the past");
  }
  const has = (key) => query.has(key);
  const guests = Number(query.get("guests") ?? 0);
  const matches = FLEET.filter(
    (yacht) =>
      (!has("destination") ||
        yacht.departure_city?.toLowerCase() === query.get("destination").toLowerCase()) &&
      (!has("type") || yacht.type?.toLowerCase() === query.get("type").toLowerCase()) &&
      yacht.capacity >= guests &&
      (!has("min_price") ||
        (yacht.starting_price !== null &&
          yacht.starting_price >= Number(query.get("min_price")))) &&
      (!has("max_price") ||
        (yacht.starting_price !== null && yacht.starting_price <= Number(query.get("max_price")))),
  ).map((yacht) => ({
    ...yacht,
    available_on_date: has("date") ? yacht.departure_city === "Kochi" : null,
  }));
  const page = Number(query.get("page") ?? 1);
  const limit = Number(query.get("limit") ?? 20);
  const body = {
    items: matches.slice((page - 1) * limit, page * limit),
    total: matches.length,
    page,
    limit,
  };
  return { status: 200, body };
}

function route(url) {
  const query = url.searchParams;
  if (url.pathname === "/yachts") return listYachts(query);
  if (url.pathname === "/yachts/filters") return { status: 200, body: FILTERS };

  const [, , slug, section] = url.pathname.split("/");
  const yacht = FLEET.find((item) => item.slug === slug);
  if (!yacht) return error(404, "YACHT_NOT_FOUND", "Yacht not found");
  if (query.get("slot_type_id") === RETIRED_SLOT_TYPE) {
    return error(400, "INVALID_SLOT_TYPE", "Not an active slot type of this yacht");
  }
  if (!section) return { status: 200, body: detail(yacht) };
  if (section === "calendar") return { status: 200, body: calendar(query.get("month")) };
  if (section === "addons") return { status: 200, body: ADDONS };
  if (section === "slots") {
    const guests = Number(query.get("guests") ?? 0);
    if (guests > GUEST_LIMIT) {
      return error(400, "GUESTS_EXCEED_CAPACITY", "More guests than this yacht takes");
    }
    return { status: 200, body: slots(query.get("date"), guests) };
  }
  return error(404, undefined, "Not found");
}

let requests = [];

createServer((request, response) => {
  const url = new URL(request.url, `http://localhost:${PORT}`);
  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
  if (url.pathname === "/__requests") {
    response.writeHead(200, headers).end(JSON.stringify(requests));
    return;
  }
  if (url.pathname === "/__reset") {
    requests = [];
    response.writeHead(204, headers).end();
    return;
  }
  requests.push(url.pathname + url.search);
  const { status, body } = route(url);
  response.writeHead(status, headers).end(JSON.stringify(body));
}).listen(PORT, () => console.log(`Mock yacht API on http://localhost:${PORT}`));
