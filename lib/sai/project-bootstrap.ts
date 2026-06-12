import { findAgentForRole, getAgents } from "./agents";
import { addProjectMemory } from "./project-memory";
import { provisionProjectDriveWorkspace } from "./drive-workspace";
import {
  ensureDefaultKnowledgeResources,
  getProjectResources,
  syncIntegrationsToResources,
} from "./project-resources";
import { getProjectById } from "./projects";

/** Bootstrap project memory, drive workspace, and default resources on project creation. */
export async function bootstrapProjectInfrastructure(
  projectId: string,
  projectName?: string,
): Promise<void> {
  const project = await getProjectById(projectId);
  const name = projectName ?? project?.name ?? "Project";

  const existing = await getProjectResources(projectId);
  if (existing.length === 0) {
    await ensureDefaultKnowledgeResources(projectId, name);
    await addProjectMemory({
      projectId,
      memoryType: "knowledge",
      title: `${name} — Project Memory Initialized`,
      summary: "Automatic project memory created. Decisions, requirements, architecture, and session artifacts will be indexed here.",
      sourceType: "project_bootstrap",
      sourceId: projectId,
    });
  }

  await provisionProjectDriveWorkspace(projectId, name);
  await syncIntegrationsToResources(projectId);

  const agents = await getAgents();
  const docAgent = findAgentForRole(agents, ["Documentation", "Knowledge"]);
  if (docAgent) {
    await addProjectMemory({
      projectId,
      memoryType: "technical",
      title: "Documentation Agent Active",
      summary: `${docAgent.name} is responsible for Drive documents, artifact versioning, and knowledge archival.`,
      sourceType: "documentation_agent",
      sourceId: docAgent.id,
    });
  }
}
