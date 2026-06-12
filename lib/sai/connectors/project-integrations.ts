import { createSupabaseAdmin } from "@/lib/supabase/admin";

function joinedRow<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export type ProjectIntegration = {
  id: string;
  projectId: string;
  projectName?: string;
  integrationAccountId: string;
  provider: string;
  accountLabel: string;
  config: Record<string, unknown>;
};

export async function getProjectIntegrations(projectId?: string): Promise<ProjectIntegration[]> {
  const supabase = createSupabaseAdmin();
  let query = supabase
    .from("project_integrations")
    .select("id, project_id, integration_account_id, config, projects(name), integration_accounts(provider, account_label)")
    .order("created_at", { ascending: false });

  if (projectId) query = query.eq("project_id", projectId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const project = joinedRow(row.projects as { name: string } | { name: string }[] | null);
    const account = joinedRow(
      row.integration_accounts as { provider: string; account_label: string } | { provider: string; account_label: string }[] | null,
    );
    return {
      id: row.id,
      projectId: row.project_id,
      projectName: project?.name,
      integrationAccountId: row.integration_account_id,
      provider: account?.provider ?? "",
      accountLabel: account?.account_label ?? "",
      config: (row.config as Record<string, unknown>) ?? {},
    };
  });
}

export async function assignIntegrationToProject(input: {
  projectId: string;
  integrationAccountId: string;
  config?: Record<string, unknown>;
}): Promise<ProjectIntegration> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_integrations")
    .upsert(
      {
        project_id: input.projectId,
        integration_account_id: input.integrationAccountId,
        config: input.config ?? {},
      },
      { onConflict: "project_id,integration_account_id" },
    )
    .select("id, project_id, integration_account_id, config")
    .single();

  if (error) throw new Error(error.message);
  return {
    id: data.id,
    projectId: data.project_id,
    integrationAccountId: data.integration_account_id,
    provider: "",
    accountLabel: "",
    config: (data.config as Record<string, unknown>) ?? {},
  };
}
