import type { Agent, Employee, Task } from "./types";

export type AssignmentRecommendation = {
  agentId: string | null;
  agentName: string | null;
  employeeId: string | null;
  employeeName: string | null;
  reason: string;
};

function agentWorkload(agent: Agent): number {
  return agent.activeTaskCount ?? 0;
}

export function recommendAssignment(
  task: Pick<Task, "title" | "description" | "workflowStepKey" | "projectId">,
  agents: Agent[],
  employees: Employee[],
): AssignmentRecommendation {
  const activeAgents = agents.filter((a) => a.status !== "disabled");
  const text = `${task.title} ${task.description} ${task.workflowStepKey ?? ""}`.toLowerCase();

  const roleMatchers: { keywords: string[]; roles: string[] }[] = [
    { keywords: ["requirement", "prd", "product"], roles: ["product management", "product manager"] },
    { keywords: ["architect", "design", "api"], roles: ["architecture", "architect"] },
    { keywords: ["plan", "timeline", "execution"], roles: ["project management", "project manager"] },
    { keywords: ["assign", "route", "orchestr"], roles: ["orchestrator", "work routing"] },
    { keywords: ["implement", "code", "engineer"], roles: ["engineering", "software engineer"] },
    { keywords: ["qa", "test", "validat"], roles: ["quality assurance", "qa"] },
    { keywords: ["deploy", "devops", "release"], roles: ["devops"] },
    { keywords: ["document", "docs"], roles: ["documentation"] },
    { keywords: ["knowledge", "archive", "lesson"], roles: ["documentation", "knowledge"] },
  ];

  let matchRoles: string[] = [];
  for (const matcher of roleMatchers) {
    if (matcher.keywords.some((k) => text.includes(k))) {
      matchRoles = matcher.roles;
      break;
    }
  }

  if (matchRoles.length === 0 && task.workflowStepKey) {
    const stepRoles: Record<string, string[]> = {
      requirements: ["product management"],
      design: ["architecture"],
      tasks: ["project management"],
      assignment: ["orchestrator"],
      implementation: ["engineering"],
      validation: ["quality assurance"],
      deployment: ["devops"],
      documentation: ["documentation"],
      knowledge: ["documentation"],
    };
    matchRoles = stepRoles[task.workflowStepKey] ?? [];
  }

  const candidates = activeAgents
    .filter((a) =>
      matchRoles.length === 0 ||
      matchRoles.some(
        (r) =>
          a.role.toLowerCase().includes(r) ||
          a.name.toLowerCase().includes(r),
      ),
    )
    .sort((a, b) => agentWorkload(a) - agentWorkload(b));

  const bestAgent = candidates[0] ?? activeAgents.sort((a, b) => agentWorkload(a) - agentWorkload(b))[0];

  const orchestrator = activeAgents.find(
    (a) =>
      a.role.toLowerCase().includes("orchestrator") ||
      a.name.toLowerCase().includes("orchestrator"),
  );

  const availableEmployees = employees
    .filter((e) => e.status !== "offline")
    .sort((a, b) => (a.status === "busy" ? 1 : 0) - (b.status === "busy" ? 1 : 0));

  const bestEmployee = availableEmployees[0] ?? null;

  const approver = orchestrator ?? bestAgent;

  return {
    agentId: bestAgent?.id ?? null,
    agentName: bestAgent?.name ?? null,
    employeeId: bestEmployee?.id ?? null,
    employeeName: bestEmployee?.name ?? null,
    reason: approver
      ? `${approver.name} recommended based on role match, skills, and workload (${agentWorkload(approver)} active tasks)`
      : "No matching agent found",
  };
}
