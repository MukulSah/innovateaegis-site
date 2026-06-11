import type { Agent } from "./types";

export type HierarchyNode = {
  id: string;
  name: string;
  role: string;
  isOwner?: boolean;
  children: HierarchyNode[];
};

export function validateReportingHierarchy(
  agentId: string | null,
  reportingAgentId: string | null,
  agents: Pick<Agent, "id" | "reportingAgentId">[],
): string | null {
  if (!reportingAgentId) {
    return null;
  }

  if (agentId && reportingAgentId === agentId) {
    return "An agent cannot report to itself.";
  }

  const byId = new Map(agents.map((a) => [a.id, a]));

  if (!byId.has(reportingAgentId)) {
    return "Reporting agent not found.";
  }

  let current: string | null = reportingAgentId;
  const visited = new Set<string>();

  while (current) {
    if (agentId && current === agentId) {
      return "Circular reporting hierarchy detected.";
    }
    if (visited.has(current)) {
      return "Circular reporting hierarchy detected.";
    }
    visited.add(current);
    current = byId.get(current)?.reportingAgentId ?? null;
  }

  return null;
}

export function buildAgentHierarchy(agents: Agent[], founderName = "Founder"): HierarchyNode {
  const ownerNode: HierarchyNode = {
    id: "owner",
    name: founderName,
    role: "Founder",
    isOwner: true,
    children: [],
  };

  if (agents.length === 0) {
    return ownerNode;
  }

  const nodes = new Map<string, HierarchyNode>(
    agents.map((agent) => [
      agent.id,
      {
        id: agent.id,
        name: agent.name,
        role: agent.role,
        children: [],
      },
    ]),
  );

  const roots: HierarchyNode[] = [];

  for (const agent of agents) {
    const node = nodes.get(agent.id)!;
    if (agent.reportingAgentId && nodes.has(agent.reportingAgentId)) {
      nodes.get(agent.reportingAgentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (list: HierarchyNode[]) => {
    list.sort((a, b) => a.name.localeCompare(b.name));
    for (const node of list) {
      sortNodes(node.children);
    }
  };

  sortNodes(roots);
  ownerNode.children = roots;
  return ownerNode;
}

export function getReportingLabel(agent: Agent, founderName = "Founder"): string {
  if (!agent.reportingAgentId) {
    return `Founder (${founderName})`;
  }
  return agent.reportingAgentName ?? "Unknown agent";
}
