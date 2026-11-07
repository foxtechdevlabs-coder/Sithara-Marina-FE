/**
 * DUMMY data for the Home "Featured yacht." carousel only. It deliberately does
 * not come from GET /yachts. Everything else about yachts uses the real API.
 */
interface FeaturedFleetYacht {
  id: string;
  name: string;
  location: string;
  /** Cruising area, e.g. "Alleppey". */
  area: string;
  image: { src: string; alt: string };
  lengthMetres: number;
  guests: number;
  suites: number;
  description: string;
}

const unsplash = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1300&q=80`;

export const dummyFleet: FeaturedFleetYacht[] = [
  {
    id: "astra-one",
    name: "Astra One",
    location: "Kochi",
    area: "Kochi",
    image: {
      src: "/images/yachts/astra-one-arabian-sea.png",
      alt: "Astra One cruising off the Kerala coast",
    },
    lengthMetres: 46,
    guests: 12,
    suites: 6,
    description:
      "Our flagship superyacht. Spacious suites, open-air living, and the freedom to venture further.",
  },
  {
    id: "malabar",
    name: "Malabar",
    location: "Kochi",
    area: "Kochi",
    image: { src: unsplash("1569263979104-865ab7cd8d13"), alt: "Malabar motor yacht" },
    lengthMetres: 28,
    guests: 8,
    suites: 4,
    description:
      "An intimate coastal retreat, made for hidden anchorages and unhurried days on the Arabian Sea.",
  },
  {
    id: "neelam",
    name: "Neelam",
    location: "Kochi",
    area: "Alleppey",
    image: { src: unsplash("1593693411515-c20261bcad6e"), alt: "Neelam houseboat" },
    lengthMetres: 24,
    guests: 6,
    suites: 3,
    description:
      "The traditional Kerala houseboat, beautifully reimagined for a slower, more private escape.",
  },
  {
    id: "ananta",
    name: "Ananta",
    location: "Kochi",
    area: "Kochi",
    image: { src: unsplash("1540946485063-a40da27545f8"), alt: "Ananta sailing yacht" },
    lengthMetres: 26,
    guests: 8,
    suites: 4,
    description:
      "The romance of sailing, with every modern comfort. For those who prefer to follow the wind.",
  },
];
