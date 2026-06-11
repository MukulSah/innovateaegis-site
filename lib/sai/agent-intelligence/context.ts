import "server-only";

import { searchBrainMemory } from "@/lib/sai/brain/search";
import { getOrganizationalMemory } from "@/lib/sai/organizational-memory";
import { getProjects } from "@/lib/sai/projects";
import { getTasks } from "@/lib/sai/tasks";
import { getGovernanceStats } from "@/lib/sai/governance";
import { getMeetings } from "@/lib/sai/meetings";
import type { Agent, Project, Task } from "@/lib/sai/types";
import type { OrganizationalMemoryRecord } from "@/lib/sai/organizational-memory.types";
import type { BrainSearchResult } from "@/lib/sai/brain/types";

export type AgentIntelligenceContext = {
  agent: Agent;
  projects: Project[];
  agentProjects: Project[];
  openTasks: Task[];
  orgMemories: OrganizationalMemoryRecord[];
  brainRecords: BrainSearchResult[];
  governance: Awaited<ReturnType<typeof getGovernanceStats>>;
  upcomingMeetings: Awaited<ReturnType<typeof getMeetings>>;
};

export async function gatherAgentIntelligenceContext(agent: Agent): Promise<AgentIntelligenceContext> {
  const [projects, tasks, orgMemories, governance, upcomingMeetings] = await Promise.all([
    getProjects(),
    getTasks(),
    getOrganizationalMemory({ limit: 30 }),
    getGovernanceStats(),
    getMeetings({ status: "scheduled" }),
  ]);

  const agentProjects = projects.filter((p) => agent.projectIds.includes(p.id));
  const openTasks = tasks.filter(
    (t) =>
      !["released", "archived"].includes(t.status) &&
      (agent.projectIds.includes(t.projectId) || t.assignedAgentId === agent.id),
  );

  const brainQueries = [
    ...agent.objectives.slice(0, 2),
    ...agent.responsibilities.slice(0, 2),
    agent.department,
  ].filter(Boolean);

  const brainResults: BrainSearchResult[] = [];
  for (const query of brainQueries) {
    const results = await searchBrainMemory({ query, limit: 5, status: "active" });
    for (const r of results) {
      if (!brainResults.some((existing) => existing.id === r.id)) {
        brainResults.push(r);
      }
    }
  }

  const relevantMemories = orgMemories.filter(
    (m) =>
      m.relatedAgentId === agent.id ||
      (m.relatedProjectId && agent.projectIds.includes(m.relatedProjectId)) ||
      m.importance === "critical" ||
      m.importance === "high",
  );

  return {
    agent,
    projects,
    agentProjects,
    openTasks,
    orgMemories: relevantMemories.slice(0, 15),
    brainRecords: brainResults.slice(0, 10),
    governance,
    upcomingMeetings: upcomingMeetings.slice(0, 5),
  };
}
