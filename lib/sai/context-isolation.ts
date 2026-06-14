import { createHash } from "crypto";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getDecisions } from "./decisions";
import { getMemories } from "./memories";
import { getSessionArtifacts, type SessionArtifact } from "./session-artifacts";
import { artifactByStep, formatArtifactSection } from "./context-budget";
import type { AgentExecutionContext } from "./agent-executor";
import type { RoleContextKey } from "./context-budget";
import type { Decision, ProjectMemoryEntry } from "./types";

export type MemoryBucketType = "global" | "project" | "session";

export type IsolationOptions = {
  includeHistorical?: boolean;
  includeProjectKnowledge?: boolean;
};

export type IsolatedContextSlice = {
  objective: string;
  projectName: string;
  sessionArtifacts: SessionArtifact[];
  sessionDecisions: Decision[];
  approvedRequirements: SessionArtifact | undefined;
  approvedArchitecture: SessionArtifact | undefined;
  sessionDeliverables: SessionArtifact[];
  resourceMap: string;
  globalKnowledge: string;
  projectKnowledge: ProjectMemoryEntry[];
  sources: string[];
  excluded: string[];
};

const GLOBAL_MEMORY_LIMIT = 5;

async function loadResourceMap(projectId: string): Promise<string> {
  const [
    { getProjectResources },
    { getProjectIntegrations },
  ] = await Promise.all([
    import("./project-resources"),
    import("./connectors/project-integrations"),
  ]);

  const [resources, integrations] = await Promise.all([
    getProjectResources(projectId),
    getProjectIntegrations(projectId),
  ]);

  const lines: string[] = ["## Session Resource Map"];
  for (const r of resources.slice(0, 6)) {
    lines.push(`- ${r.resourceType}: ${r.resourceName} (${r.resourceIdentifier})`);
  }
  if (integrations.length) {
    lines.push("\n## Integrations");
    for (const i of integrations.slice(0, 3)) {
      lines.push(`- ${i.provider}: ${i.accountLabel}`);
    }
  }
  return lines.join("\n");
}

async function loadGlobalKnowledge(projectId: string): Promise<string> {
  const memories = await getMemories({ projectId }, GLOBAL_MEMORY_LIMIT);
  if (!memories.length) return "";
  return `## Global Knowledge\n${memories.map((m) => `- ${m.title}: ${(m.content ?? "").slice(0, 120)}`).join("\n")}`;
}

async function loadProjectKnowledge(
  projectId: string,
  workflowId: string | null | undefined,
  includeHistorical: boolean,
): Promise<ProjectMemoryEntry[]> {
  if (!includeHistorical) return [];
  const { getProjectMemory } = await import("./project-memory");
  const all = await getProjectMemory(projectId);
  return all.filter(
    (m) =>
      m.sourceType !== "memory_compression_v1" &&
      m.sourceType !== "memory_compression_v2" &&
      (!m.sourceId || m.sourceId === workflowId),
  );
}

export async function buildIsolatedContextSlice(
  role: RoleContextKey,
  ctx: AgentExecutionContext,
  options: IsolationOptions = {},
): Promise<IsolatedContextSlice> {
  const includeHistorical = options.includeHistorical ?? false;
  const includeProjectKnowledge = options.includeProjectKnowledge ?? includeHistorical;
  const sources: string[] = ["objective", "session"];
  const excluded: string[] = [];

  if (!includeHistorical) {
    excluded.push(
      "previous_objectives",
      "historical_requirements",
      "historical_architecture",
      "historical_implementation",
      "cross_session_deliverables",
    );
  }

  const [artifacts, decisions, resourceMap, globalKnowledge, projectKnowledge] = await Promise.all([
    ctx.workflowId ? getSessionArtifacts(ctx.workflowId) : Promise.resolve([]),
    ctx.workflowId ? getDecisions({ workflowId: ctx.workflowId }) : Promise.resolve([]),
    ["coo", "pm", "architect", "engineer", "orchestrator"].includes(role)
      ? loadResourceMap(ctx.projectId)
      : Promise.resolve(""),
    ["ceo", "coo"].includes(role) ? loadGlobalKnowledge(ctx.projectId) : Promise.resolve(""),
    includeProjectKnowledge
      ? loadProjectKnowledge(ctx.projectId, ctx.workflowId, includeHistorical)
      : Promise.resolve([]),
  ]);

  if (globalKnowledge) sources.push("global_knowledge");
  if (projectKnowledge.length) sources.push("project_knowledge");
  if (decisions.length) sources.push("session_decisions");
  if (artifacts.length) sources.push("session_artifacts");

  const approvedRequirements = artifactByStep(artifacts, "requirements");
  const approvedArchitecture = artifactByStep(artifacts, "design");

  return {
    objective: ctx.objective,
    projectName: ctx.projectName,
    sessionArtifacts: artifacts,
    sessionDecisions: decisions,
    approvedRequirements,
    approvedArchitecture,
    sessionDeliverables: artifacts.filter((a) => a.artifactRefId || a.artifactName),
    resourceMap,
    globalKnowledge,
    projectKnowledge,
    sources,
    excluded,
  };
}

export async function persistSessionContext(input: {
  workflowRunId: string;
  agentId: string;
  stepKey: string;
  roleKey: RoleContextKey;
  allowedSources: string[];
  excludedSources: string[];
  tokenBudget: number;
  actualTokens: number;
  contextMarkdown: string;
}): Promise<void> {
  const supabase = createSupabaseAdmin();
  const hash = createHash("sha256").update(input.contextMarkdown).digest("hex").slice(0, 16);

  await supabase.from("session_contexts").insert({
    workflow_run_id: input.workflowRunId,
    agent_id: input.agentId,
    step_key: input.stepKey,
    role_key: input.roleKey,
    allowed_sources: input.allowedSources,
    excluded_sources: input.excludedSources,
    token_budget: input.tokenBudget,
    actual_tokens: input.actualTokens,
    context_hash: hash,
    isolation_version: "v1",
  });
}

export async function upsertSessionMemoryBucket(input: {
  workflowRunId: string;
  projectId: string;
  bucketType: MemoryBucketType;
  memoryKey: string;
  content: Record<string, unknown>;
  tokenEstimate?: number;
}): Promise<void> {
  const supabase = createSupabaseAdmin();
  await supabase.from("session_memory_buckets").upsert(
    {
      workflow_run_id: input.workflowRunId,
      project_id: input.projectId,
      bucket_type: input.bucketType,
      memory_key: input.memoryKey,
      content: input.content,
      token_estimate: input.tokenEstimate ?? 0,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "workflow_run_id,bucket_type,memory_key" },
  );
}

export function formatIsolationNotice(excluded: string[]): string | null {
  if (!excluded.length) return null;
  return `## Context Isolation\nThis session uses isolated context. Excluded automatically: ${excluded.join(", ")}.`;
}

export function filterArtifactsForRole(
  role: RoleContextKey,
  slice: IsolatedContextSlice,
): SessionArtifact[] {
  const { sessionArtifacts } = slice;
  switch (role) {
    case "ceo":
      return sessionArtifacts.filter((a) => a.stepKey === "ceo_strategy").slice(-1);
    case "coo":
      return sessionArtifacts.slice(-8);
    case "pm":
      return sessionArtifacts.filter((a) =>
        ["requirements", "ceo_strategy", "coo_execution"].includes(a.stepKey),
      );
    case "architect":
      return sessionArtifacts.filter((a) =>
        ["requirements", "design", "execution_readiness"].includes(a.stepKey),
      );
    case "engineer":
      return sessionArtifacts.filter((a) =>
        ["requirements", "design", "tasks", "implementation"].includes(a.stepKey),
      );
    case "qa":
      return sessionArtifacts.filter((a) =>
        ["requirements", "implementation", "validation"].includes(a.stepKey),
      );
    case "documentation":
      return sessionArtifacts.filter((a) =>
        ["requirements", "validation", "deployment", "documentation", "knowledge"].includes(a.stepKey),
      );
    case "orchestrator":
      return sessionArtifacts.filter((a) =>
        ["requirements", "execution_readiness"].includes(a.stepKey),
      );
    default:
      return sessionArtifacts;
  }
}

export function buildRoleSectionsFromSlice(
  role: RoleContextKey,
  agent: { name: string; role: string; description?: string | null },
  slice: IsolatedContextSlice,
  ctx: AgentExecutionContext,
): string[] {
  const artifacts = filterArtifactsForRole(role, slice);
  const sections: string[] = [
    `# Context for ${agent.name} (${agent.role})`,
    `## Current Objective\n${slice.objective}`,
    `## Project\n${slice.projectName}`,
  ];

  const notice = formatIsolationNotice(slice.excluded);
  if (notice) sections.push(notice);

  if (agent.description) sections.push(`## Role\n${agent.description}`);
  if (slice.globalKnowledge && ["ceo", "coo"].includes(role)) {
    sections.push(slice.globalKnowledge);
  }

  if (role === "ceo") {
    const strategic = formatArtifactSection(artifactByStep(artifacts, "ceo_strategy"), 2_000);
    if (strategic) sections.push(strategic);
  } else if (role === "coo") {
    if (ctx.strategicBrief) {
      sections.push(`## Strategic Brief\n${JSON.stringify(ctx.strategicBrief, null, 2).slice(0, 2_000)}`);
    }
    const ceoArtifact = formatArtifactSection(artifactByStep(artifacts, "ceo_strategy"), 1_500);
    if (ceoArtifact) sections.push(ceoArtifact);
    if (slice.sessionDecisions.length) {
      sections.push(
        `## Session Decisions\n${slice.sessionDecisions.slice(0, 4).map((d) => `- ${d.title}`).join("\n")}`,
      );
    }
    if (slice.resourceMap) sections.push(slice.resourceMap);
  } else if (role === "pm") {
    const req = formatArtifactSection(slice.approvedRequirements, 2_500);
    if (req) sections.push(req);
    if (slice.sessionDecisions.length) {
      sections.push(
        `## Session Decisions\n${slice.sessionDecisions.slice(0, 6).map((d) => `- ${d.title}: ${d.decision.slice(0, 100)}`).join("\n")}`,
      );
    }
    if (slice.resourceMap) sections.push(slice.resourceMap.slice(0, 1_200));
  } else if (role === "architect") {
    const req = formatArtifactSection(slice.approvedRequirements, 3_000);
    if (req) sections.push(req);
    if (slice.sessionDecisions.length) {
      sections.push(
        `## Approved Decisions\n${slice.sessionDecisions.slice(0, 4).map((d) => `- ${d.title}`).join("\n")}`,
      );
    }
    const design = formatArtifactSection(slice.approvedArchitecture, 1_500);
    if (design) sections.push(design);
  } else if (role === "engineer") {
    const req = formatArtifactSection(slice.approvedRequirements, 2_000);
    const arch = formatArtifactSection(slice.approvedArchitecture, 3_000);
    const tasks = formatArtifactSection(artifactByStep(artifacts, "tasks"), 2_000);
    if (req) sections.push(req);
    if (arch) sections.push(arch);
    if (tasks) sections.push(tasks);
  } else if (role === "qa") {
    const req = formatArtifactSection(slice.approvedRequirements, 2_000);
    const impl = formatArtifactSection(artifactByStep(artifacts, "implementation"), 3_000);
    if (req) sections.push(req);
    if (impl) sections.push(impl);
  } else if (role === "orchestrator") {
    const req = formatArtifactSection(slice.approvedRequirements, 2_000);
    if (req) sections.push(req);
    if (slice.resourceMap) sections.push(slice.resourceMap.slice(0, 1_000));
  } else if (role === "documentation") {
    sections.push(
      `## Session Deliverables\n${artifacts.map((a) => `- ${a.artifactName ?? a.stepKey}`).join("\n") || "None yet"}`,
    );
    for (const a of artifacts.slice(-4)) {
      const block = formatArtifactSection(a, 1_500);
      if (block) sections.push(block);
    }
  }

  return sections;
}
