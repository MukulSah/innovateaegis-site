import type { Agent } from "./types";
import type { AgentExecutionContext } from "./agent-executor";
import type { ProjectMemoryEntry } from "./types";
import type { SessionArtifact } from "./session-artifacts";
import { truncateToTokenBudget } from "./token-estimate";

export type RoleContextKey =
  | "ceo"
  | "coo"
  | "pm"
  | "architect"
  | "engineer"
  | "orchestrator"
  | "documentation"
  | "qa"
  | "default";

export const ROLE_TOKEN_BUDGETS: Record<RoleContextKey, number> = {
  ceo: 6_000,
  coo: 6_000,
  pm: 8_000,
  architect: 10_000,
  engineer: 12_000,
  orchestrator: 6_000,
  documentation: 6_000,
  qa: 6_000,
  default: 6_000,
};

export function resolveRoleKey(agent: Agent): RoleContextKey {
  const r = agent.role.toLowerCase();
  const n = agent.name.toLowerCase();
  if (r.includes("ceo") || n.includes("ceo")) return "ceo";
  if (r.includes("coo") || n.includes("coo")) return "coo";
  if (r.includes("product") || n.includes("product manager")) return "pm";
  if (r.includes("orchestrat") || n.includes("orchestrat")) return "orchestrator";
  if (r.includes("documentation") || n.includes("documentation")) return "documentation";
  if (r.includes("qa") || r.includes("quality")) return "qa";
  if (r.includes("architect")) return "architect";
  if (r.includes("engineer") || r.includes("engineering")) return "engineer";
  return "default";
}

export function artifactByStep(
  artifacts: SessionArtifact[],
  stepKey: string,
): SessionArtifact | undefined {
  return artifacts.find((a) => a.stepKey === stepKey);
}

export function formatMemorySection(
  title: string,
  entries: ProjectMemoryEntry[],
  limit: number,
): string | null {
  if (!entries.length) return null;
  return `## ${title}\n${entries
    .slice(0, limit)
    .map((m) => `- ${m.title}: ${(m.summary || "").slice(0, 200)}`)
    .join("\n")}`;
}

export function formatArtifactSection(
  artifact: SessionArtifact | undefined,
  maxChars = 3_000,
): string | null {
  if (!artifact) return null;
  const label = artifact.artifactName ?? artifact.stepKey;
  return `## ${label}\n${artifact.outputSummary.slice(0, maxChars)}`;
}

export function applyContextBudget(
  role: RoleContextKey,
  sections: string[],
): { markdown: string; truncated: boolean } {
  const joined = sections.filter(Boolean).join("\n\n");
  const budget = ROLE_TOKEN_BUDGETS[role] ?? ROLE_TOKEN_BUDGETS.default;
  const truncated = joined.length > budget * 4;
  return {
    markdown: truncateToTokenBudget(joined, budget),
    truncated,
  };
}

export type ContextLoadPlan = {
  role: RoleContextKey;
  needsArtifacts: boolean;
  needsSessionArtifacts: boolean;
  needsBudgetedMemory: boolean;
  needsCompanyMemories: boolean;
  needsResources: boolean;
  needsConversations: boolean;
  needsDocuments: boolean;
  needsDecisions: boolean;
};

export function getContextLoadPlan(role: RoleContextKey, ctx: AgentExecutionContext): ContextLoadPlan {
  return {
    role,
    needsArtifacts: Boolean(ctx.workflowId) && ["coo", "pm", "architect", "engineer", "orchestrator", "documentation", "qa"].includes(role),
    needsSessionArtifacts: Boolean(ctx.workflowId) && role !== "ceo",
    needsBudgetedMemory: false,
    needsCompanyMemories: role === "ceo",
    needsResources: ["coo", "pm", "architect", "engineer", "orchestrator"].includes(role),
    needsConversations: role === "coo",
    needsDocuments: false,
    needsDecisions: role === "coo",
  };
}
