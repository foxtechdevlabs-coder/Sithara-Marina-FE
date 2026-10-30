import { siteConfig } from "@/config/site";

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface YachtSchemaData {
  id: string;
  name: string;
  description: string;
  image: string;
  ratePerDay?: number;
  lengthMetres?: number;
  guests?: number;
  suites?: number;
  area?: string;
}

export const FAQ_DATA: readonly FaqItem[] = [
  {
    question: "What kind of journeys do you arrange?",
    answer:
      "We curate private backwater day cruises in Alleppey and Kumarakom, coastal voyages along the Malabar Coast, multi-day island expeditions to Lakshadweep and the Maldives, as well as bespoke sunset charters and milestone celebrations.",
  },
  {
    question: "Do I need any sailing experience?",
    answer:
      "No sailing experience is required. Every Sithara Marina charter includes a licensed, veteran captain and a dedicated professional crew who handle navigation, vessel operations, and five-star hospitality throughout your voyage.",
  },
  {
    question: "When is the best time to visit?",
    answer:
      "The peak sailing season across Kerala and the Arabian Sea runs from October through April, characterized by clear skies, calm waters, and refreshing breezes. Serene backwater charters are also deeply restorative during the lush monsoon months.",
  },
  {
    question: "What is included in a private charter?",
    answer:
      "Every charter includes private and exclusive yacht hire, captain and crew services, vessel fuel, custom dining menus crafted by onboard chefs, non-alcoholic beverages, watersports/snorkelling gear, and dedicated concierge itinerary planning.",
  },
  {
    question: "How do I begin planning?",
    answer:
      "You can start by submitting an enquiry through our 'Plan your charter' page or reaching out to our concierge via phone at +919724553452 or email at sitharamarina@gmail.com. We design each journey around your schedule and preferences.",
  },
];

/**
 * Organization and LocalBusiness schema for Sithara Marina.
 */
export function generateLocalBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "TravelAgency", "TouristAttraction"],
    "@id": `${siteConfig.url}/#business`,
    name: siteConfig.name,
    alternateName: "Sithara Marina Yacht Charters",
    description: siteConfig.description,
    url: siteConfig.url,
    telephone: siteConfig.telephone,
    email: siteConfig.email,
    logo: siteConfig.logo,
    image: siteConfig.ogImage,
    priceRange: siteConfig.priceRange,
    currenciesAccepted: siteConfig.currenciesAccepted,
    paymentAccepted: siteConfig.paymentAccepted,
    address: {
      "@type": "PostalAddress",
      streetAddress: siteConfig.address.streetAddress,
      addressLocality: siteConfig.address.addressLocality,
      addressRegion: siteConfig.address.addressRegion,
      postalCode: siteConfig.address.postalCode,
      addressCountry: siteConfig.address.addressCountry,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: siteConfig.geo.latitude,
      longitude: siteConfig.geo.longitude,
    },
    areaServed: siteConfig.areaServed.map((area) => ({
      "@type": "AdministrativeArea",
      name: area,
    })),
    sameAs: siteConfig.sameAs,
  };
}

/**
 * Website schema for site identification and search potential.
 */
export function generateWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteConfig.url}/#website`,
    url: siteConfig.url,
    name: siteConfig.name,
    description: siteConfig.description,
    publisher: {
      "@id": `${siteConfig.url}/#business`,
    },
  };
}

/**
 * FAQPage schema for high-ranking AI Overviews, Perplexity citations, and Google rich results.
 */
export function generateFaqSchema(items: readonly FaqItem[] = FAQ_DATA) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

/**
 * BreadcrumbList schema for structured crawl paths.
 */
export function generateBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${siteConfig.url}${item.url}`,
    })),
  };
}

/**
 * Product/Service schema for individual yacht charters.
 */
export function generateYachtProductSchema(yacht: YachtSchemaData) {
  const yachtUrl = `${siteConfig.url}/yachts/${yacht.id}`;
  const imageUrl = yacht.image.startsWith("http") ? yacht.image : `${siteConfig.url}${yacht.image}`;

  return {
    "@context": "https://schema.org",
    "@type": ["Product", "Service"],
    "@id": `${yachtUrl}/#yacht`,
    name: `${yacht.name} — Luxury Yacht Charter`,
    description: yacht.description,
    url: yachtUrl,
    image: imageUrl,
    brand: {
      "@type": "Brand",
      name: siteConfig.name,
    },
    offers: yacht.ratePerDay
      ? {
          "@type": "Offer",
          price: yacht.ratePerDay,
          priceCurrency: "INR",
          priceValidUntil: "2027-12-31",
          availability: "https://schema.org/InStock",
          url: yachtUrl,
        }
      : undefined,
  };
}

/**
 * ItemList schema for fleet showcase.
 */
export function generateFleetItemListSchema(yachts: readonly YachtSchemaData[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Sithara Marina Luxury Fleet Collection",
    description: "Private luxury yachts and houseboats available for charter in Kerala and beyond.",
    itemListElement: yachts.map((yacht, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${siteConfig.url}/yachts/${yacht.id}`,
      name: yacht.name,
      description: yacht.description,
    })),
  };
}
