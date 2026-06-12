import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { getProjectIntegrations } from "./connectors/project-integrations";

export type ProjectResourceType =
  | "repository"
  | "drive_workspace"
  | "database"
  | "server"
  | "domain"
  | "model"
  | "integration"
  | "knowledge_source";

export type ProjectResourceStatus = "active" | "pending" | "missing" | "error";

export type ProjectResource = {
  id: string;
  projectId: string;
  resourceType: ProjectResourceType;
  resourceName: string;
  resourceIdentifier: string;
  status: ProjectResourceStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

type ResourceRow = {
  id: string;
  project_id: string;
  resource_type: string;
  resource_name: string;
  resource_identifier: string;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

function mapRow(row: ResourceRow): ProjectResource {
  return {
    id: row.id,
    projectId: row.project_id,
    resourceType: row.resource_type as ProjectResourceType,
    resourceName: row.resource_name,
    resourceIdentifier: row.resource_identifier,
    status: row.status as ProjectResourceStatus,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function upsertProjectResource(input: {
  projectId: string;
  resourceType: ProjectResourceType;
  resourceName: string;
  resourceIdentifier: string;
  status?: ProjectResourceStatus;
  metadata?: Record<string, unknown>;
}): Promise<ProjectResource> {
  const supabase = createSupabaseAdmin();
  const { data: existing } = await supabase
    .from("project_resources")
    .select("id")
    .eq("project_id", input.projectId)
    .eq("resource_type", input.resourceType)
    .eq("resource_name", input.resourceName)
    .maybeSingle();

  const payload = {
    project_id: input.projectId,
    resource_type: input.resourceType,
    resource_name: input.resourceName,
    resource_identifier: input.resourceIdentifier,
    status: input.status ?? "active",
    metadata: input.metadata ?? {},
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { data, error } = await supabase
      .from("project_resources")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return mapRow(data as ResourceRow);
  }

  const { data, error } = await supabase
    .from("project_resources")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapRow(data as ResourceRow);
}

export async function getProjectResources(projectId: string): Promise<ProjectResource[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_resources")
    .select("*")
    .eq("project_id", projectId)
    .order("resource_type")
    .order("resource_name");

  if (error) throw new Error(error.message);
  return (data as ResourceRow[]).map(mapRow);
}

export async function getProjectResourceMap(projectId: string): Promise<Record<string, string>> {
  const resources = await getProjectResources(projectId);
  const map: Record<string, string> = {};
  for (const r of resources) {
    if (r.status === "active") {
      map[r.resourceType] = r.resourceIdentifier;
    }
  }
  return map;
}

/** Sync integration assignments into the resource registry. */
export async function syncIntegrationsToResources(projectId: string): Promise<void> {
  const integrations = await getProjectIntegrations(projectId);
  for (const integration of integrations) {
    const config = integration.config ?? {};
    if (integration.provider === "github" && config.repo) {
      await upsertProjectResource({
        projectId,
        resourceType: "repository",
        resourceName: String(config.repo),
        resourceIdentifier: String(config.repo),
        status: "active",
        metadata: { integrationAccountId: integration.integrationAccountId },
      });
    }
    if (integration.provider === "google_drive" && config.folder) {
      await upsertProjectResource({
        projectId,
        resourceType: "drive_workspace",
        resourceName: String(config.folder),
        resourceIdentifier: String(config.folder),
        status: "active",
        metadata: { integrationAccountId: integration.integrationAccountId },
      });
    }
    await upsertProjectResource({
      projectId,
      resourceType: "integration",
      resourceName: integration.accountLabel || integration.provider,
      resourceIdentifier: integration.provider,
      status: "active",
      metadata: { config },
    });
  }
}

export async function ensureDefaultKnowledgeResources(projectId: string, projectName: string): Promise<void> {
  await upsertProjectResource({
    projectId,
    resourceType: "knowledge_source",
    resourceName: "Company Brain",
    resourceIdentifier: "company_brain",
    status: "active",
  });
  await upsertProjectResource({
    projectId,
    resourceType: "knowledge_source",
    resourceName: "Project Memory",
    resourceIdentifier: `project_memory:${projectId}`,
    status: "active",
  });
  await upsertProjectResource({
    projectId,
    resourceType: "model",
    resourceName: "Default AI Model",
    resourceIdentifier: process.env.SAI_DEFAULT_MODEL ?? "configured",
    status: "active",
  });
}
