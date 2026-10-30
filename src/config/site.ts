export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "https://sithara-marina-fe-1wgk-chi.vercel.app";

export const siteConfig = {
  name: "Sithara Marina",
  shortName: "Sithara Marina",
  title: "Sithara Marina — Luxury Yacht & Houseboat Charters in Kerala",
  description:
    "Experience bespoke luxury yacht and houseboat charters in Kerala. Sail Kochi, Kumarakom, Alleppey backwaters, Lakshadweep, and Maldives with private crew & chef.",
  url: SITE_URL,
  ogImage: `${SITE_URL}/images/home/hero-yacht-img.png`,
  logo: `${SITE_URL}/images/brand/sithara-marina-logo.svg`,
  telephone: "+919724553452",
  email: "sitharamarina@gmail.com",
  priceRange: "₹₹₹₹",
  currenciesAccepted: "INR, USD, EUR",
  paymentAccepted: "Credit Card, Bank Transfer, UPI",
  address: {
    streetAddress: "Marine Drive Promenade, Kochi Waterfront",
    addressLocality: "Kochi",
    addressRegion: "Kerala",
    postalCode: "682031",
    addressCountry: "IN",
  },
  geo: {
    latitude: 9.9816,
    longitude: 76.2753,
  },
  areaServed: [
    "Kerala Backwaters",
    "Kochi",
    "Alleppey",
    "Kumarakom",
    "Malabar Coast",
    "Lakshadweep Islands",
    "The Maldives",
  ],
  sameAs: ["https://instagram.com/sitharamarina", "https://youtube.com/@sitharamarina"],
  keywords: [
    "luxury yacht charter Kerala",
    "Kerala backwaters yacht",
    "Kochi private yacht booking",
    "luxury houseboat Alleppey",
    "Kumarakom yacht cruise",
    "superyacht charter Arabian Sea",
    "Lakshadweep yacht expedition",
    "Maldives private yacht charter",
    "crewed boat rental Kerala",
    "Sithara Marina",
  ],
} as const;
