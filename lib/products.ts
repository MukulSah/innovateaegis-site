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
  {
    slug: "manavya",
    name: "Manavya AI",
    category: "users",
    tagline: "Intelligence born of creation.",
    description:
      "Manavya is a unified AI platform powered by the M2 intelligence engine, built for daily tasks, reasoning, expert-level coding, and collaborative workspaces.",
    whatItDoes: [
      "Powers daily productivity tasks and complex reasoning workflows.",
      "Assists in advanced software engineering with project-aware coding.",
      "Enables multi-modal creativity with image and video generation.",
      "Fosters teamwork through shared workspaces and durable project context in Cowork.",
    ],
    features: [
      {
        title: "Manavya M2 Core",
        text: "The central cognitive routing, planning, and verification engine.",
      },
      {
        title: "Playground & Chat",
        text: "Interactive canvas for rapid model testing and daily task orchestration.",
      },
      {
        title: "Advanced Code & Reasoning",
        text: "Project-aware developer assistance that builds, reviews, and debugs code.",
      },
      {
        title: "Manavya Cowork",
        text: "Durable shared workspaces that maintain goals, decisions, and files.",
      },
    ],
    ctaLabel: "Launch Manavya M2",
    accentFrom: "#ff6b57",
    accentTo: "#f5c77e",
  },
  {
    slug: "unite",
    name: "Unite Platform",
    category: "business",
    tagline: "The unified operating system for company alignment.",
    description:
      "Unite aggregates organizational data, aligns department priorities, and streamlines cross-functional workflows, keeping everyone synced with real-time operations.",
    whatItDoes: [
      "Centralizes company goals and departments in one system.",
      "Coordinates team milestones and tracks operational blockers.",
      "Provides clear department dashboards to reduce status meetings.",
      "Aligns engineering, product, and leadership tracks.",
    ],
    features: [
      {
        title: "Unified Goals",
        text: "Keep cross-functional teams aligned on organizational targets.",
      },
      {
        title: "Blocker Tracking",
        text: "Highlight operational hurdles and assign resolution owners.",
      },
      {
        title: "Milestones",
        text: "Visualize development phases and product release tracks.",
      },
      {
        title: "Sync Engine",
        text: "Reduce meeting overhead with continuous department status feeds.",
      },
    ],
    ctaLabel: "Request Demo",
    accentFrom: "#ec4899",
    accentTo: "#f43f5e",
  },
  {
    slug: "sai",
    name: "SAI",
    category: "business",
    tagline: "Autonomous Software Agent Intelligence for enterprise execution.",
    description:
      "SAI is an enterprise-grade agent orchestration dashboard that runs workflows, tracks project history, compiles releases, and automates operational processes.",
    whatItDoes: [
      "Orchestrates autonomous agents to run dev and business tasks.",
      "Compiles system releases and tracks software deployments.",
      "Manages team activities and logs organizational decision memory.",
      "Assists company executives with detailed project health assessments.",
    ],
    features: [
      {
        title: "Agent Dashboard",
        text: "Spawn, configure, and monitor AI agents running background workflows.",
      },
      {
        title: "Release Compiler",
        text: "Automate build assemblies and coordinate software deployments.",
      },
      {
        title: "Organizational Memory",
        text: "Capture and search historical team decisions and project changes.",
      },
      {
        title: "Executive Insights",
        text: "Access deep metrics and health analysis for ongoing projects.",
      },
    ],
    ctaLabel: "Explore SAI",
    accentFrom: "#8b5cf6",
    accentTo: "#6366f1",
  },
];

export const productGroups = {
  business: products.filter((product) => product.category === "business"),
  users: products.filter((product) => product.category === "users"),
};

export const findProductBySlug = (slug: string) =>
  products.find((product) => product.slug === slug);
