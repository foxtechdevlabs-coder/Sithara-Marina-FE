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
 * FAQPage schema for high-ranking AI Overviews, Perplexity citations, and Google rich results,
 * from the published FAQs (GET /content/faqs) so it always matches the page.
 */
export function generateFaqSchema(items: readonly FaqItem[]) {
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
