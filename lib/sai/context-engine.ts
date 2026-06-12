import { getWorkflowConversations } from "./agent-conversations";
import { getDecisions } from "./decisions";
import { getDocuments } from "./documents";
import { getMemories } from "./memories";
import { getProjectMemory } from "./project-memory";
import { getSessionArtifacts } from "./session-artifacts";
import type { Agent } from "./types";
import type { AgentExecutionContext } from "./agent-executor";

export type ContextBundle = {
  markdown: string;
  sources: string[];
  loadedAt: string;
};

const CEO_EXCLUDE = ["implementation", "code", "task backlog", "repository"];
const ENGINEER_INCLUDE = ["requirement", "architecture", "technical", "feature"];

function roleKey(agent: Agent): string {
  const r = agent.role.toLowerCase();
  const n = agent.name.toLowerCase();
  if (r.includes("ceo") || n.includes("ceo")) return "ceo";
  if (r.includes("coo") || n.includes("coo")) return "coo";
  if (r.includes("product") || n.includes("product manager")) return "pm";
  if (r.includes("orchestrat") || n.includes("orchestrat")) return "orchestrator";
  if (r.includes("documentation") || n.includes("documentation")) return "documentation";
  if (r.includes("engineer") || r.includes("engineering")) return "engineer";
  if (r.includes("architect")) return "architect";
  return "default";
}

async function safeLoad<T>(label: string, loader: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await loader();
  } catch (error) {
    console.warn(`[context-engine] ${label} failed:`, error);
    return fallback;
  }
}

async function loadResourceContext(projectId: string): Promise<string> {
  const [
    { getProjectResources },
    { getProjectDriveFolders },
    { getProjectDriveDocuments },
    { getProjectIntegrations },
  ] = await Promise.all([
    import("./project-resources"),
    import("./drive-workspace"),
    import("./documentation-pipeline"),
    import("./connectors/project-integrations"),
  ]);

  const [resources, folders, documents, integrations] = await Promise.all([
    getProjectResources(projectId),
    getProjectDriveFolders(projectId),
    getProjectDriveDocuments(projectId, 10),
    getProjectIntegrations(projectId),
  ]);

  const lines: string[] = ["## Resource Map"];
  for (const r of resources) {
    lines.push(`- ${r.resourceType}: ${r.resourceName} (${r.resourceIdentifier}) [${r.status}]`);
  }
  if (integrations.length) {
    lines.push("\n## Integrations");
    for (const i of integrations) {
      lines.push(`- ${i.provider}: ${i.accountLabel} ${JSON.stringify(i.config)}`);
    }
  }
  if (folders.length) {
    lines.push("\n## Drive Workspace");
    for (const f of folders.slice(0, 8)) {
      lines.push(`- ${f.folderType}: ${f.driveFolderPath}`);
    }
  }
  if (documents.length) {
    lines.push("\n## Documentation Links");
    for (const d of documents.slice(0, 6)) {
      lines.push(`- ${d.documentTitle}: ${d.driveUrl}`);
    }
  }
  return lines.join("\n");
}

export async function getAgentContext(
  agent: Agent,
  ctx: AgentExecutionContext,
): Promise<ContextBundle> {
  const loadedAt = new Date().toISOString();
  const sources: string[] = [];
  const role = roleKey(agent);

  const [memories, documents, decisions, conversations, projectMemory, artifacts, resourceContext] =
    await Promise.all([
      safeLoad("memories", () => getMemories({ projectId: ctx.projectId }), []),
      ctx.workflowId
        ? safeLoad("documents", () => getDocuments({ workflowId: ctx.workflowId! }), [])
        : Promise.resolve([]),
      ctx.workflowId
        ? safeLoad("decisions", () => getDecisions({ workflowId: ctx.workflowId! }), [])
        : Promise.resolve([]),
      ctx.workflowId
        ? safeLoad("conversations", () => getWorkflowConversations(ctx.workflowId!), [])
        : Promise.resolve([]),
      safeLoad("project_memory", () => getProjectMemory(ctx.projectId), []),
      ctx.workflowId
        ? safeLoad("artifacts", () => getSessionArtifacts(ctx.workflowId!), [])
        : ctx.objectiveId
          ? safeLoad("objective_artifacts", async () => {
              const { getObjectiveArtifacts } = await import("./session-artifacts");
              return getObjectiveArtifacts(ctx.objectiveId!);
            }, [])
          : Promise.resolve([]),
      safeLoad("resources", () => loadResourceContext(ctx.projectId), ""),
    ]);

  const sections: string[] = [
    `# Context for ${agent.name} (${agent.role})`,
    `## Objective\n${ctx.objective}`,
    `## Project\n${ctx.projectName}`,
  ];

  if (agent.description) sections.push(`## Role\n${agent.description}`);

  if (ctx.strategicBrief) {
    const brief = ctx.strategicBrief as Record<string, unknown>;
    if (brief.executionReadiness) {
      sections.push(`## Execution Readiness\n${JSON.stringify(brief.executionReadiness, null, 2)}`);
    }
  }

  if (role === "ceo") {
    sources.push("objective", "company_memory", "strategic_layer");
    const strategic = projectMemory.filter(
      (m) => m.memoryType === "decision" || m.memoryType === "requirement",
    );
    if (strategic.length) {
      sections.push(
        `## Company Goals & Priorities\n${strategic.slice(0, 8).map((m) => `- ${m.title}: ${m.summary}`).join("\n")}`,
      );
    }
    if (memories.length) {
      sections.push(
        `## Company Memory\n${memories.slice(0, 5).map((m) => `- ${m.title}`).join("\n")}`,
      );
    }
  } else if (role === "coo") {
    sources.push("objective", "strategic_brief", "active_sessions", "resource_map");
    if (ctx.strategicBrief) {
      sections.push(`## Strategic Brief\n${JSON.stringify(ctx.strategicBrief, null, 2)}`);
    }
    const briefArtifact = artifacts.find((a) => a.stepKey === "ceo_strategy");
    if (briefArtifact) {
      sections.push(`## CEO Output\n${briefArtifact.outputSummary.slice(0, 1500)}`);
    }
    if (resourceContext) sections.push(resourceContext);
  } else if (role === "pm") {
    sources.push(
      "analytics",
      "feedback",
      "founder_notes",
      "requirements",
      "project_memory",
      "resource_map",
      "documentation",
      "session_history",
    );
    const decisions_mem = projectMemory.filter((m) => m.memoryType === "decision");
    const reqs = projectMemory.filter((m) => m.memoryType === "requirement");
    const lessons = projectMemory.filter((m) => m.memoryType === "lesson");
    const arch = projectMemory.filter((m) => m.memoryType === "architecture");

    sections.push(`## Project Description\n${ctx.objective}`);
    if (decisions_mem.length) {
      sections.push(
        `## Previous Decisions\n${decisions_mem.slice(0, 6).map((m) => `- ${m.title}: ${m.summary}`).join("\n")}`,
      );
    }
    if (reqs.length) {
      sections.push(
        `## Prior Requirements\n${reqs.slice(0, 6).map((m) => `- ${m.title}: ${m.summary}`).join("\n")}`,
      );
    }
    if (arch.length) {
      sections.push(
        `## Architecture History\n${arch.slice(0, 4).map((m) => `- ${m.title}`).join("\n")}`,
      );
    }
    if (lessons.length) {
      sections.push(
        `## Open Risks & Lessons\n${lessons.slice(0, 4).map((m) => `- ${m.title}: ${m.summary}`).join("\n")}`,
      );
    }
    if (resourceContext) sections.push(resourceContext);
    if (artifacts.length) {
      sections.push(
        `## Session History\n${artifacts.slice(-5).map((a) => `- ${a.artifactName ?? a.stepKey}`).join("\n")}`,
      );
    }
  } else if (role === "orchestrator") {
    sources.push("requirements", "agent_availability", "resource_map", "governance");
    const reqArtifact = artifacts.find((a) => a.stepKey === "requirements");
    if (reqArtifact) {
      sections.push(`## Approved Requirements\n${reqArtifact.outputSummary.slice(0, 2000)}`);
    }
    if (resourceContext) sections.push(resourceContext);
    const agents = await safeLoad("agents", async () => {
      const { getAgents } = await import("./agents");
      return getAgents();
    }, []);
    if (agents.length) {
      sections.push(
        `## Agent Availability\n${agents.filter((a) => a.status !== "disabled").slice(0, 12).map((a) => `- ${a.name} (${a.role})`).join("\n")}`,
      );
    }
  } else if (role === "documentation") {
    sources.push("project_memory", "artifacts", "drive_workspace");
    sections.push(
      `## Artifacts to Archive\n${artifacts.map((a) => `- ${a.artifactName ?? a.stepKey}`).join("\n") || "None yet"}`,
    );
    if (resourceContext) sections.push(resourceContext);
  } else if (role === "architect" || role === "engineer") {
    sources.push("requirements", "architecture", "tasks", "standards", "resource_map");
    for (const a of artifacts) {
      if (a.stepKey === "requirements" || a.stepKey === "design") {
        sections.push(`## ${a.artifactName ?? a.stepKey}\n${a.outputSummary.slice(0, 2000)}`);
      }
    }
    const technical = projectMemory.filter((m) => ENGINEER_INCLUDE.includes(m.memoryType));
    if (technical.length) {
      sections.push(
        `## Project Technical Context\n${technical.slice(0, 6).map((m) => `- ${m.title}`).join("\n")}`,
      );
    }
    if (resourceContext) sections.push(resourceContext);
  } else {
    sources.push("workflow_documents", "decisions", "project_memory");
    if (documents.length) {
      sections.push(
        `## Documents\n${documents.map((d) => `### ${d.title}\n${d.content.slice(0, 400)}`).join("\n\n")}`,
      );
    }
  }

  if (role !== "ceo") {
    if (decisions.length) {
      sources.push("decisions");
      sections.push(`## Decisions\n${decisions.map((d) => `- ${d.title}`).join("\n")}`);
    }
    if (conversations.length) {
      sections.push(
        `## Recent Agent Messages\n${conversations.slice(-4).map((c) => `${c.senderAgentName}: ${c.message.slice(0, 120)}`).join("\n")}`,
      );
    }
  }

  if (ctx.handoffContext) {
    sections.push(`## Handoff\n${ctx.handoffContext}`);
  }

  if (role === "ceo") {
    const filtered = sections.filter(
      (s) => !CEO_EXCLUDE.some((ex) => s.toLowerCase().includes(ex)),
    );
    return { markdown: filtered.join("\n\n"), sources, loadedAt };
  }

  return { markdown: sections.filter(Boolean).join("\n\n"), sources, loadedAt };
}
