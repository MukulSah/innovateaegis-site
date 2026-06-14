import type { Agent } from "./types";

const STEP_TIMEOUT_MS: Record<string, number> = {
  ceo_strategy: 120_000,
  coo_execution: 120_000,
  design: 120_000,
  requirements: 90_000,
  tasks: 90_000,
  implementation: 90_000,
  validation: 45_000,
  deployment: 45_000,
  documentation: 45_000,
  knowledge: 45_000,
};

function roleFromAgent(agent?: Agent | null): string {
  if (!agent) return "default";
  const r = agent.role.toLowerCase();
  const n = agent.name.toLowerCase();
  if (r.includes("ceo") || n.includes("ceo")) return "ceo";
  if (r.includes("coo") || n.includes("coo")) return "coo";
  if (r.includes("architect")) return "architect";
  if (r.includes("product") || n.includes("product manager")) return "pm";
  if (r.includes("engineer") || r.includes("engineering")) return "engineer";
  if (r.includes("qa") || r.includes("quality")) return "qa";
  if (r.includes("documentation")) return "documentation";
  if (r.includes("knowledge")) return "knowledge";
  return "default";
}

/** Per-step timeout overrides; falls back to role-based defaults. */
export function getAgentTimeoutMs(stepKey: string, agent?: Agent | null): number {
  if (STEP_TIMEOUT_MS[stepKey]) return STEP_TIMEOUT_MS[stepKey];

  switch (roleFromAgent(agent)) {
    case "ceo":
    case "coo":
    case "architect":
      return 120_000;
    case "pm":
    case "engineer":
      return 90_000;
    case "qa":
    case "documentation":
    case "knowledge":
      return 45_000;
    default:
      return 45_000;
  }
}
