import { truncateToTokenBudget } from "./token-estimate";
import type { RoleContextKey } from "./context-budget";
import { ROLE_TOKEN_BUDGETS } from "./context-budget";
import {
  buildRoleSectionsFromSlice,
  type IsolatedContextSlice,
} from "./context-isolation";
import type { AgentExecutionContext } from "./agent-executor";
import type { Agent } from "./types";

export const MEMORY_COMPRESSION_V2_SOURCE = "memory_compression_v2";
export const MEMORY_SUMMARY_V2_TITLE = "memory_summary_v2";

export const ROLE_MEMORY_RECORD_LIMITS: Partial<Record<RoleContextKey, number>> = {
  pm: 10,
  architect: 15,
  engineer: 20,
  qa: 10,
  orchestrator: 10,
  documentation: 10,
};

export type CompressedContextV2 = {
  markdown: string;
  role: RoleContextKey;
  tokenBudget: number;
  estimatedTokens: number;
  truncated: boolean;
  includedKeys: string[];
};

const ROLE_INCLUDED_KEYS: Record<RoleContextKey, string[]> = {
  ceo: ["objective", "strategic_brief", "global_knowledge"],
  coo: ["objective", "strategic_brief", "session_decisions", "session_artifacts", "resource_map"],
  pm: ["objective", "session_requirements", "session_decisions"],
  architect: ["requirements", "approved_decisions", "session_architecture"],
  engineer: ["requirements", "architecture", "tasks"],
  qa: ["requirements", "implementation"],
  orchestrator: ["requirements", "resource_map"],
  documentation: ["approved_artifacts", "deliverables"],
  default: ["objective", "session_artifacts"],
};

function compressSliceMarkdown(role: RoleContextKey, slice: IsolatedContextSlice): string {
  const lines: string[] = [`# Session Context (${role})`, "", `**Objective:** ${slice.objective}`, ""];

  switch (role) {
    case "pm":
      if (slice.approvedRequirements) {
        lines.push("## Session Requirements");
        lines.push(slice.approvedRequirements.outputSummary.slice(0, 2_500));
      }
      if (slice.sessionDecisions.length) {
        lines.push("", "## Session Decisions");
        for (const d of slice.sessionDecisions.slice(0, 6)) {
          lines.push(`- **${d.title}**: ${d.decision.slice(0, 150)}`);
        }
      }
      break;
    case "architect":
      if (slice.approvedRequirements) {
        lines.push("## Requirements");
        lines.push(slice.approvedRequirements.outputSummary.slice(0, 2_500));
      }
      if (slice.sessionDecisions.length) {
        lines.push("", "## Approved Decisions");
        for (const d of slice.sessionDecisions.slice(0, 4)) {
          lines.push(`- ${d.title}`);
        }
      }
      break;
    case "engineer":
      if (slice.approvedRequirements) {
        lines.push("## Requirements");
        lines.push(slice.approvedRequirements.outputSummary.slice(0, 1_800));
      }
      if (slice.approvedArchitecture) {
        lines.push("", "## Architecture");
        lines.push(slice.approvedArchitecture.outputSummary.slice(0, 2_500));
      }
      break;
    case "qa": {
      const impl = slice.sessionArtifacts.find((a) => a.stepKey === "implementation");
      if (slice.approvedRequirements) {
        lines.push("## Requirements");
        lines.push(slice.approvedRequirements.outputSummary.slice(0, 1_500));
      }
      if (impl) {
        lines.push("", "## Implementation");
        lines.push(impl.outputSummary.slice(0, 2_500));
      }
      break;
    }
    case "orchestrator": {
      const deploy = slice.sessionArtifacts.find((a) => a.stepKey === "deployment");
      const qa = slice.sessionArtifacts.find((a) => a.stepKey === "validation");
      if (deploy) {
        lines.push("## Deployment Package");
        lines.push(deploy.outputSummary.slice(0, 2_000));
      }
      if (qa) {
        lines.push("", "## QA Report");
        lines.push(qa.outputSummary.slice(0, 2_000));
      }
      if (!deploy && !qa && slice.approvedRequirements) {
        lines.push("## Requirements");
        lines.push(slice.approvedRequirements.outputSummary.slice(0, 2_000));
      }
      break;
    }
    case "documentation":
      lines.push("## Final Approved Artifacts");
      for (const a of slice.sessionDeliverables.slice(-6)) {
        lines.push(`- ${a.artifactName ?? a.stepKey}`);
      }
      break;
    default:
      lines.push("## Session Artifacts");
      for (const a of slice.sessionArtifacts.slice(-5)) {
        lines.push(`- ${a.artifactName ?? a.stepKey}`);
      }
  }

  return lines.join("\n");
}

/** Role-specific minimal context — session knowledge only, auto-compressed to token budget. */
export function buildCompressedAgentContextV2(
  role: RoleContextKey,
  agent: Agent,
  slice: IsolatedContextSlice,
  ctx: AgentExecutionContext,
): CompressedContextV2 {
  const tokenBudget = ROLE_TOKEN_BUDGETS[role] ?? ROLE_TOKEN_BUDGETS.default;
  const fullSections = buildRoleSectionsFromSlice(role, agent, slice, ctx);
  const joined = fullSections.filter(Boolean).join("\n\n");

  if (joined.length <= tokenBudget * 4) {
    return {
      markdown: joined,
      role,
      tokenBudget,
      estimatedTokens: Math.ceil(joined.length / 4),
      truncated: false,
      includedKeys: ROLE_INCLUDED_KEYS[role] ?? ROLE_INCLUDED_KEYS.default,
    };
  }

  const compressed = compressSliceMarkdown(role, slice);
  const markdown = truncateToTokenBudget(compressed, tokenBudget);

  return {
    markdown,
    role,
    tokenBudget,
    estimatedTokens: Math.ceil(markdown.length / 4),
    truncated: markdown.length < compressed.length,
    includedKeys: ROLE_INCLUDED_KEYS[role] ?? ROLE_INCLUDED_KEYS.default,
  };
}
