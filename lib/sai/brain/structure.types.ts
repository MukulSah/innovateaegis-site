/** Locked Company Brain structure — client-safe constants */

export type BrainLayerSlug = "strategic" | "operational" | "intelligence" | "connectivity";

export type BrainSectionSlug =
  | "mission-vision"
  | "values-policies"
  | "objectives-goals"
  | "company-structure"
  | "sops"
  | "company-decisions"
  | "company-knowledge"
  | "workflows-processes"
  | "data-analytics"
  | "risk-compliance"
  | "innovation-sandbox"
  | "learning-feedback"
  | "communication-framework"
  | "partnerships-ecosystem"
  | "customer-knowledge-base";

export type BrainLayerDef = {
  slug: BrainLayerSlug;
  name: string;
  purpose: string;
  icon: string;
  sections: BrainSectionDef[];
};

export type BrainSectionDef = {
  slug: BrainSectionSlug;
  name: string;
  custodianAgentRole: string;
  visibleTo: string[];
};

export const COMPANY_BRAIN_LAYERS: BrainLayerDef[] = [
  {
    slug: "strategic",
    name: "Strategic Layer",
    purpose: "Why InnovateAegis exists and where it is going",
    icon: "◈",
    sections: [
      { slug: "mission-vision", name: "Mission & Vision", custodianAgentRole: "ceo", visibleTo: ["all_agents"] },
      { slug: "values-policies", name: "Values & Policies", custodianAgentRole: "ceo", visibleTo: ["all_agents"] },
      { slug: "objectives-goals", name: "Objectives & Goals", custodianAgentRole: "ceo", visibleTo: ["all_agents"] },
      { slug: "company-structure", name: "Company Structure", custodianAgentRole: "ceo", visibleTo: ["all_agents"] },
    ],
  },
  {
    slug: "operational",
    name: "Operational Layer",
    purpose: "How InnovateAegis operates daily",
    icon: "⚙",
    sections: [
      { slug: "sops", name: "SOPs", custodianAgentRole: "documentation", visibleTo: ["all_agents"] },
      { slug: "company-decisions", name: "Company Decisions", custodianAgentRole: "documentation", visibleTo: ["all_agents"] },
      { slug: "company-knowledge", name: "Company Knowledge", custodianAgentRole: "documentation", visibleTo: ["all_agents"] },
      { slug: "workflows-processes", name: "Workflows & Processes", custodianAgentRole: "coo", visibleTo: ["all_agents"] },
    ],
  },
  {
    slug: "intelligence",
    name: "Intelligence Layer",
    purpose: "Organizational learning and strategic intelligence",
    icon: "◆",
    sections: [
      { slug: "data-analytics", name: "Data & Analytics", custodianAgentRole: "product-manager", visibleTo: ["all_agents"] },
      { slug: "risk-compliance", name: "Risk & Compliance", custodianAgentRole: "solution-architect", visibleTo: ["all_agents"] },
      { slug: "innovation-sandbox", name: "Innovation Sandbox", custodianAgentRole: "product-manager", visibleTo: ["all_agents"] },
      { slug: "learning-feedback", name: "Learning & Feedback", custodianAgentRole: "qa-engineer", visibleTo: ["all_agents"] },
    ],
  },
  {
    slug: "connectivity",
    name: "Connectivity Layer",
    purpose: "Relationship intelligence",
    icon: "◎",
    sections: [
      { slug: "communication-framework", name: "Communication Framework", custodianAgentRole: "team-orchestrator", visibleTo: ["all_agents"] },
      { slug: "partnerships-ecosystem", name: "Partnerships & Ecosystem", custodianAgentRole: "ceo", visibleTo: ["all_agents"] },
      { slug: "customer-knowledge-base", name: "Customer Knowledge Base", custodianAgentRole: "product-manager", visibleTo: ["all_agents"] },
    ],
  },
];

/** Agent role → accessible section slugs */
export const AGENT_BRAIN_ACCESS: Record<string, BrainSectionSlug[]> = {
  ceo: [
    "mission-vision", "values-policies", "objectives-goals", "company-structure",
    "company-decisions", "partnerships-ecosystem", "learning-feedback",
  ],
  coo: [
    "values-policies", "workflows-processes", "company-decisions", "risk-compliance",
    "partnerships-ecosystem",
  ],
  "product-manager": [
    "objectives-goals", "data-analytics", "innovation-sandbox", "customer-knowledge-base",
  ],
  "project-manager": ["objectives-goals", "workflows-processes", "learning-feedback"],
  "team-orchestrator": ["company-structure", "communication-framework", "workflows-processes"],
  "solution-architect": ["company-knowledge", "risk-compliance", "innovation-sandbox"],
  "software-engineer": ["company-knowledge", "innovation-sandbox"],
  "qa-engineer": ["sops", "learning-feedback", "risk-compliance"],
  devops: ["workflows-processes", "data-analytics"],
  documentation: ["sops", "company-decisions", "company-knowledge", "customer-knowledge-base"],
  sales: ["customer-knowledge-base", "partnerships-ecosystem"],
  marketing: ["customer-knowledge-base", "communication-framework"],
  "customer-success": ["customer-knowledge-base", "learning-feedback"],
  finance: ["data-analytics", "risk-compliance"],
};

export function agentCanAccessSection(agentRole: string, sectionSlug: BrainSectionSlug): boolean {
  const normalized = agentRole.toLowerCase().replace(/\s+/g, "-");
  const access = AGENT_BRAIN_ACCESS[normalized];
  if (!access) return false;
  return access.includes(sectionSlug);
}

export function getSectionDef(slug: BrainSectionSlug): BrainSectionDef | undefined {
  for (const layer of COMPANY_BRAIN_LAYERS) {
    const section = layer.sections.find((s) => s.slug === slug);
    if (section) return section;
  }
  return undefined;
}

export function getLayerDef(slug: BrainLayerSlug): BrainLayerDef | undefined {
  return COMPANY_BRAIN_LAYERS.find((l) => l.slug === slug);
}
