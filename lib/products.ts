export type ProductCategory = "business" | "users";
export type ProductStatus = "live" | "coming" | "lab";

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
  status: ProductStatus;
  statusLabel: string;
  liveUrl?: string;
  formerly?: string;
};

export const products: Product[] = [
  {
    slug: "manavya",
    name: "Manavya AI",
    category: "users",
    tagline: "Intelligence born of creation.",
    description:
      "Manavya is the coming AI model of Innovative Aegis — a native intelligence layer for reasoning, coding, research, and cowork. The M2 engine is already in motion. The full Manavya model is being finished.",
    whatItDoes: [
      "Coordinates thinking, planning, and tool use instead of answering in isolation.",
      "Assists in software engineering with project-aware coding and review.",
      "Enables multimodal creation across image, video, and design surfaces.",
      "Keeps durable workspace memory so teams can work across days, not chats.",
    ],
    features: [
      {
        title: "Manavya Model",
        text: "A coming native intelligence layer — not a wrapper, a mind of our own.",
      },
      {
        title: "M2 Engine",
        text: "Routing, planning, and verification already live in the Manavya playground.",
      },
      {
        title: "Cowork",
        text: "Shared workspaces that remember goals, decisions, and files.",
      },
      {
        title: "Creation",
        text: "From daily tasks to expert coding, research, and multimodal generation.",
      },
    ],
    ctaLabel: "Follow the model",
    accentFrom: "#ff6b57",
    accentTo: "#f5c77e",
    status: "coming",
    statusLabel: "Model coming",
    liveUrl: "https://manavya.innovativeaegis.com",
  },
  {
    slug: "careermate",
    name: "CareerMate",
    category: "users",
    tagline: "Everything you need to get hired.",
    description:
      "CareerMate is a career operating system — resume builder, ATS scanner, Manavya review, interview coach, and application tracker. Formerly HYGYR. Free forever. No paywalls to download your own resume.",
    whatItDoes: [
      "Builds ATS-ready resumes with 10 templates and 5 template families.",
      "Reviews every bullet with Manavya before recruiters see it.",
      "Practices interviews until the real round feels familiar.",
      "Tracks applications from applied to offer on one dashboard.",
    ],
    features: [
      {
        title: "Resume Builder",
        text: "Professional structure recruiters expect — name, experience, education, skills, projects.",
      },
      {
        title: "Manavya Review",
        text: "The career mentor that rewrites generic lines into measurable impact.",
      },
      {
        title: "ATS Scanner",
        text: "Built to pass modern hiring systems with live score feedback.",
      },
      {
        title: "Interview Coach",
        text: "Rehearse STAR answers until confidence replaces anxiety.",
      },
      {
        title: "Application Tracker",
        text: "Google, Amazon, Microsoft, Infosys — every stage, one place.",
      },
      {
        title: "Free Forever",
        text: "₹0. All templates open. Free download. No hidden upgrades.",
      },
    ],
    ctaLabel: "Enter CareerMate",
    accentFrom: "#3b82f6",
    accentTo: "#a855f7",
    status: "live",
    statusLabel: "Live",
    liveUrl: "https://careermate.innovativeaegis.com/",
    formerly: "HYGYR",
  },
  {
    slug: "aurora-ai",
    name: "Aurora AI",
    category: "business",
    tagline: "A robotaxi garage being cooked for Indian streets.",
    description:
      "Aurora is a local robotaxi simulator and driving model — Innova Crysta, Carens, and XUV700 in the garage, sensor kits on the roof, tracks in Bengaluru, Mumbai, Delhi, and Chennai. Drop into Indiranagar. Drive the street, not an empty highway.",
    whatItDoes: [
      "Lets you pick a real Indian taxi spec — Innova Crysta, Kia Carens, or Mahindra XUV700.",
      "Kits cameras, LiDAR, radar, and GNSS / IMU before the map loads.",
      "Loads Indian city tracks first: Bengaluru, Mumbai, Delhi, Chennai.",
      "Drops the car into places like Indiranagar and hands you Drive, mirrors, and cabin.",
    ],
    features: [
      {
        title: "Garage",
        text: "Front bay shows the taxi you will drop. Size and sensors follow published spec sheets.",
      },
      {
        title: "Sensor profile",
        text: "Cameras, LiDAR, radar, GNSS / IMU — sensitivity before the city appears.",
      },
      {
        title: "Indian tracks",
        text: "MG Road grain, mixed two-wheelers, heavy metros. Map first, event second.",
      },
      {
        title: "Drop and drive",
        text: "Cabin, steering, mirrors, and optional manual keyboard from the drop.",
      },
    ],
    ctaLabel: "Open the garage",
    accentFrom: "#c9a66b",
    accentTo: "#7dd3fc",
    status: "lab",
    statusLabel: "Being cooked",
  },
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
    status: "live",
    statusLabel: "Live",
  },
  {
    slug: "facenova",
    name: "FaceNova",
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
    status: "live",
    statusLabel: "Live",
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
    status: "live",
    statusLabel: "Live",
    liveUrl: "/sai",
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
    status: "live",
    statusLabel: "Live",
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
    status: "lab",
    statusLabel: "In studio",
  },
];

export const productGroups = {
  business: products.filter((product) => product.category === "business"),
  users: products.filter((product) => product.category === "users"),
};

export const findProductBySlug = (slug: string) => {
  if (slug === "hygyr") return products.find((product) => product.slug === "careermate");
  return products.find((product) => product.slug === slug);
};
