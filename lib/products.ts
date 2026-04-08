export type ProductCategory = "business" | "users";

export type Product = {
  slug: string;
  name: string;
  category: ProductCategory;
  tagline: string;
  description: string;
  whatItDoes: string[];
  features: { title: string; text: string }[];
  ctaLabel: string;
  accentFrom: string;
  accentTo: string;
};

export const products: Product[] = [
  {
    slug: "sentra",
    name: "Sentra",
    category: "business",
    tagline: "Operational visibility for modern teams.",
    description:
      "Sentra gives organizations a controlled command surface for endpoint and workflow intelligence.",
    whatItDoes: [
      "Tracks asset state and team activity in real time.",
      "Surfaces risk signals before they become incidents.",
      "Consolidates operational data into a single control plane.",
      "Supports policy-aware workflows for distributed organizations.",
    ],
    features: [
      {
        title: "Unified Control",
        text: "One dashboard for endpoint health, software compliance, and operational alerts.",
      },
      {
        title: "Policy Signals",
        text: "Structured notifications with severity levels and ownership routing.",
      },
      {
        title: "Audit Ready",
        text: "Event traceability designed for governance and enterprise reporting.",
      },
      {
        title: "Scale Discipline",
        text: "Architecture built to stay responsive as teams and devices expand.",
      },
    ],
    ctaLabel: "Request Demo",
    accentFrom: "#3b82f6",
    accentTo: "#6366f1",
  },
  {
    slug: "facenova",
    name: "Facenova",
    category: "business",
    tagline: "Identity confidence in every check-in.",
    description:
      "Facenova is an attendance intelligence platform that combines precision recognition with operational control.",
    whatItDoes: [
      "Validates attendance events with identity-aware recognition.",
      "Reduces manual verification overhead and reporting delays.",
      "Provides transparent logs for compliance and audits.",
      "Supports controlled deployments across multiple locations.",
    ],
    features: [
      {
        title: "Recognition Core",
        text: "Optimized matching workflow tuned for speed and reliability.",
      },
      {
        title: "Live Presence Feed",
        text: "Instant attendance updates with timestamped verification.",
      },
      {
        title: "Role Policies",
        text: "Configurable access and workflow rules by department or site.",
      },
      {
        title: "Integrity Reports",
        text: "Clean exports for payroll, operations, and compliance teams.",
      },
    ],
    ctaLabel: "Request Demo",
    accentFrom: "#2563eb",
    accentTo: "#0ea5e9",
  },
  {
    slug: "hygyr",
    name: "HYGYR",
    category: "users",
    tagline: "Resume building with precision and momentum.",
    description:
      "HYGYR helps users create compelling resumes quickly through focused structure and real-time clarity.",
    whatItDoes: [
      "Guides users through practical resume structure choices.",
      "Improves content quality with direct, contextual prompts.",
      "Keeps formatting consistent across devices and exports.",
      "Helps users ship applications faster with less friction.",
    ],
    features: [
      {
        title: "Focused Editor",
        text: "A clean writing flow that keeps attention on impact and relevance.",
      },
      {
        title: "Template Logic",
        text: "Modern layouts selected for readability and hiring relevance.",
      },
      {
        title: "Instant Export",
        text: "Reliable output ready for application systems and direct sharing.",
      },
      {
        title: "Progress States",
        text: "Users can iterate confidently with controlled version checkpoints.",
      },
    ],
    ctaLabel: "Use for Free",
    accentFrom: "#2563eb",
    accentTo: "#4f46e5",
  },
  {
    slug: "smart-parking-finder",
    name: "Smart Parking Finder",
    category: "users",
    tagline: "Find parking with less uncertainty.",
    description:
      "Smart Parking Finder improves daily movement by matching drivers to likely available spaces with confidence.",
    whatItDoes: [
      "Uses live context to estimate parking availability quickly.",
      "Provides route-aware guidance to reduce unnecessary circling.",
      "Helps users compare options by time, distance, and convenience.",
      "Keeps interactions simple for use during active travel.",
    ],
    features: [
      {
        title: "Availability Signals",
        text: "Real-time indicators tuned for quick decision-making.",
      },
      {
        title: "Route Context",
        text: "Location-aware suggestions integrated with movement direction.",
      },
      {
        title: "Time Optimization",
        text: "Estimates that help users reduce search time and fuel waste.",
      },
      {
        title: "Mobile Focus",
        text: "Designed for clear, high-contrast use on phones in motion.",
      },
    ],
    ctaLabel: "Use for Free",
    accentFrom: "#0ea5e9",
    accentTo: "#3b82f6",
  },
];

export const productGroups = {
  business: products.filter((product) => product.category === "business"),
  users: products.filter((product) => product.category === "users"),
};

export const findProductBySlug = (slug: string) =>
  products.find((product) => product.slug === slug);
