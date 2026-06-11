import type { Agent, AIAgent, Employee } from "./types";

export function agentToQuickPanel(agent: Agent): AIAgent {
  const status =
    agent.status === "disabled" ? "idle" : agent.status;

  return {
    id: agent.id,
    name: agent.name,
    role: agent.role,
    responsibilities: agent.responsibilities,
    status: status as AIAgent["status"],
    assignedProjects: agent.assignedProjects,
    performanceScore: agent.performanceScore,
  };
}

export function agentsToQuickPanel(agents: Agent[]): AIAgent[] {
  return agents
    .filter((a) => a.status !== "disabled")
    .map(agentToQuickPanel);
}
