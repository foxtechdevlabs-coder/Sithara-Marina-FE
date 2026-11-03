/**
 * DUMMY fleet records for the admin Yachts list and yacht pages. Replace with
 * the admin fleet API once it is ready; the shapes match the add/edit form.
 */

export interface YachtForm {
  name: string;
  type: string;
  port: string;
  registration: string;
  regions: string[];
  ownership: "owned" | "partner";
  /** Partner company, shown as "Partner · Coastal Co." in the list. */
  partner?: string;
  length: string;
  guests: string;
  suites: string;
  crew: string;
  built: string;
  speed: string;
  tagline: string;
  description: string;
  amenities: string[];
  mode: "instant" | "slots" | "enquiry";
  rate: string;
  minDays: string;
  deposit: string;
  embark: string;
  disembark: string;
  visible: boolean;
  featured: boolean;
  status: string;
}

export interface YachtPhoto {
  src: string;
  alt: string;
}

export interface Charter {
  ref: string;
  guest: string;
  guests: number;
  embark: string;
  disembark: string;
  payment: string;
  status: string;
}

/** Operational figures shown on the admin yacht page. */
export interface YachtOps {
  upcomingCharters: number;
  bookedNext60: string;
  confirmedValue: string;
  openEnquiries: number;
  gst: string;
  nextCharter?: Charter & { inDays: number };
  bookings: Charter[];
  blockedDates: { range: string; reason: string }[];
  activity: { when: string; who: string; what: string }[];
  lastEdited: string;
}

export interface FleetRecord {
  id: string;
  form: YachtForm;
  photos: YachtPhoto[];
  ops: YachtOps;
}

const base = {
  type: "Motor yacht",
  port: "Kochi Marina",
  registration: "",
  built: "",
  speed: "",
  description: "",
  mode: "slots" as const,
  minDays: "1",
  deposit: "30",
  embark: "10:00",
  disembark: "17:00",
  featured: false,
};

export const FLEET: FleetRecord[] = [
  {
    id: "astra-one",
    form: {
      ...base,
      name: "Astra One",
      type: "Superyacht",
      registration: "IND-KOC-0046",
      regions: ["Kochi", "Lakshadweep"],
      ownership: "owned",
      length: "46",
      guests: "12",
      suites: "6",
      crew: "9",
      built: "2019 / 2024",
      speed: "12",
      tagline: "Spacious suites, open-air living, and the freedom to venture further.",
      description:
        "A world of your own, with the horizon as its only boundary. Our flagship pairs expansive teak decks and beautifully appointed suites with intuitive, discreet service.",
      amenities: [
        "Private chef",
        "Sun deck",
        "Ocean-view suites",
        "Water toys",
        "Snorkelling gear",
        "Bespoke itineraries",
      ],
      rate: "450000",
      visible: true,
      featured: true,
      status: "Active",
    },
    photos: [
      { src: "/images/yachts/astra-one-arabian-sea.png", alt: "Astra One off the Kerala coast" },
      { src: "/images/yachts/astra-one-master-suite.png", alt: "Master suite" },
      { src: "/images/yachts/astra-one-dining.png", alt: "Dining saloon" },
      { src: "/images/yachts/astra-one-saloon.png", alt: "Main saloon" },
    ],
    ops: {
      upcomingCharters: 5,
      bookedNext60: "38%",
      confirmedValue: "₹ 1.01 Cr",
      openEnquiries: 3,
      gst: "18%",
      nextCharter: {
        ...{
          ref: "SM-AO-24763",
          guest: "Meera Pillai",
          guests: 10,
          embark: "Fri 6 Nov · 10:00",
          disembark: "Sun 8 Nov · 17:00",
          payment: "Paid in full",
          status: "Confirmed",
        },
        inDays: 6,
      },
      bookings: [
        {
          ref: "SM-AO-24763",
          guest: "Meera Pillai",
          guests: 10,
          embark: "Fri 6 Nov · 10:00",
          disembark: "Sun 8 Nov · 17:00",
          payment: "Paid in full",
          status: "Confirmed",
        },
        {
          ref: "SM-AO-24781",
          guest: "Rahul Menon",
          guests: 8,
          embark: "Thu 12 Nov · 10:00",
          disembark: "Thu 12 Nov · 17:00",
          payment: "Deposit paid",
          status: "Confirmed",
        },
        {
          ref: "SM-AO-24790",
          guest: "Sofia Laurent",
          guests: 6,
          embark: "Sat 21 Nov · 10:00",
          disembark: "Mon 23 Nov · 17:00",
          payment: "Deposit paid",
          status: "Confirmed",
        },
        {
          ref: "SM-AO-24802",
          guest: "Daniel Carter",
          guests: 12,
          embark: "Fri 4 Dec · 10:00",
          disembark: "Sun 6 Dec · 17:00",
          payment: "Awaiting payment",
          status: "Pending",
        },
        {
          ref: "SM-AO-24815",
          guest: "Arjun Mehta",
          guests: 4,
          embark: "Sat 19 Dec · 10:00",
          disembark: "Sat 19 Dec · 17:00",
          payment: "Paid in full",
          status: "Confirmed",
        },
      ],
      blockedDates: [{ range: "14–16 Nov", reason: "Engine service" }],
      activity: [
        { when: "28 Oct 2026, 16:20", who: "Anjali Krishnan", what: "Updated the card tagline" },
        { when: "27 Oct 2026, 11:05", who: "Anjali Krishnan", what: "Added 2 gallery photos" },
        {
          when: "24 Oct 2026, 09:42",
          who: "Ravi Nair",
          what: "Blocked 14–16 Nov for engine service",
        },
      ],
      lastEdited: "Anjali Krishnan · 28 Oct 2026, 16:20",
    },
  },
  {
    id: "malabar",
    form: {
      ...base,
      name: "Malabar",
      regions: ["Kochi", "Malabar Coast"],
      ownership: "partner",
      partner: "Coastal Co.",
      length: "28",
      guests: "8",
      suites: "4",
      crew: "5",
      tagline:
        "An intimate coastal retreat, made for hidden anchorages and unhurried days on the Arabian Sea.",
      amenities: ["Private chef", "Sun deck", "Wi-Fi at sea"],
      rate: "180000",
      visible: true,
      status: "Active",
    },
    photos: [
      { src: "/images/home/featured-malabar-night.png", alt: "Malabar at night" },
      { src: "/images/yachts/astra-one-galley.png", alt: "Galley" },
      { src: "/images/yachts/astra-one-media-lounge.png", alt: "Media lounge" },
    ],
    ops: {
      upcomingCharters: 3,
      bookedNext60: "24%",
      confirmedValue: "₹ 32.4L",
      openEnquiries: 1,
      gst: "18%",
      nextCharter: {
        ...{
          ref: "SM-ML-24770",
          guest: "Kavya Iyer",
          guests: 6,
          embark: "Fri 13 Nov · 10:00",
          disembark: "Fri 13 Nov · 17:00",
          payment: "Awaiting payment",
          status: "Pending",
        },
        inDays: 13,
      },
      bookings: [
        {
          ref: "SM-ML-24770",
          guest: "Kavya Iyer",
          guests: 6,
          embark: "Fri 13 Nov · 10:00",
          disembark: "Fri 13 Nov · 17:00",
          payment: "Awaiting payment",
          status: "Pending",
        },
        {
          ref: "SM-ML-24788",
          guest: "Tom Becker",
          guests: 8,
          embark: "Sat 28 Nov · 10:00",
          disembark: "Sun 29 Nov · 17:00",
          payment: "Deposit paid",
          status: "Confirmed",
        },
      ],
      blockedDates: [],
      activity: [
        {
          when: "20 Oct 2026, 14:10",
          who: "Coastal Co.",
          what: "Updated availability for December",
        },
      ],
      lastEdited: "Ravi Nair · 20 Oct 2026, 14:12",
    },
  },
  {
    id: "neelam",
    form: {
      ...base,
      name: "Neelam",
      type: "Houseboat",
      port: "Alleppey",
      regions: ["Kerala Backwaters"],
      ownership: "owned",
      length: "24",
      guests: "6",
      suites: "3",
      crew: "4",
      tagline:
        "The traditional Kerala houseboat, beautifully reimagined for a slower, more private escape.",
      amenities: ["Private chef", "Ocean-view suites"],
      mode: "enquiry",
      rate: "65000",
      visible: false,
      status: "Active",
    },
    photos: [
      { src: "/images/yachts/kerala-journey-houseboat.png", alt: "Houseboat deck" },
      { src: "/images/yachts/astra-one-bathroom.png", alt: "Bathroom" },
      { src: "/images/yachts/astra-one-master-suite.png", alt: "Suite" },
    ],
    ops: {
      upcomingCharters: 2,
      bookedNext60: "17%",
      confirmedValue: "₹ 7.8L",
      openEnquiries: 4,
      gst: "18%",
      bookings: [
        {
          ref: "SM-NL-24760",
          guest: "Priya Raman",
          guests: 4,
          embark: "Sun 15 Nov · 12:00",
          disembark: "Mon 16 Nov · 11:00",
          payment: "Paid in full",
          status: "Confirmed",
        },
      ],
      blockedDates: [{ range: "1–10 Dec", reason: "Refit" }],
      activity: [
        {
          when: "18 Oct 2026, 10:30",
          who: "Anjali Krishnan",
          what: "Hid the yacht from the website",
        },
      ],
      lastEdited: "Anjali Krishnan · 18 Oct 2026, 10:30",
    },
  },
  {
    id: "ananta",
    form: {
      ...base,
      name: "Ananta",
      type: "Sailing yacht",
      regions: ["Kochi", "Malabar Coast"],
      ownership: "partner",
      length: "26",
      guests: "8",
      suites: "4",
      crew: "4",
      tagline:
        "The romance of sailing, with every modern comfort. For those who prefer to follow the wind.",
      amenities: ["Sun deck", "Water toys"],
      rate: "120000",
      visible: false,
      status: "Inactive",
    },
    photos: [{ src: "/images/home/featured-ananta-sunset.png", alt: "Ananta at sunset" }],
    ops: {
      upcomingCharters: 0,
      bookedNext60: "0%",
      confirmedValue: "₹ 0",
      openEnquiries: 0,
      gst: "18%",
      bookings: [],
      blockedDates: [],
      activity: [
        { when: "2 Oct 2026, 17:45", who: "Anjali Krishnan", what: "Deactivated the yacht" },
      ],
      lastEdited: "Anjali Krishnan · 2 Oct 2026, 17:45",
    },
  },
];

export const findYacht = (id: string) => FLEET.find((y) => y.id === id);
