import { ResourceCenterView } from "@/components/sai/resource-center-view";
import { SectionPage } from "@/components/sai/section-page";
import { getAgents } from "@/lib/sai/agents";
import { getIntegrationAccounts } from "@/lib/sai/connectors";
import { getProjectIntegrations } from "@/lib/sai/connectors/project-integrations";
import { getProjects } from "@/lib/sai/projects";
import { getProjectResources } from "@/lib/sai/project-resources";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function ResourcesPage() {
  let agents: Awaited<ReturnType<typeof getAgents>> = [];
  let accounts: Awaited<ReturnType<typeof getIntegrationAccounts>> = [];
  let projects: Awaited<ReturnType<typeof getProjects>> = [];
  let projectIntegrations: Awaited<ReturnType<typeof getProjectIntegrations>> = [];
  let allResources: Awaited<ReturnType<typeof getProjectResources>> = [];

  if (isSupabaseConfigured()) {
    [agents, accounts, projects, projectIntegrations] = await Promise.all([
      getAgents().catch(() => []),
      getIntegrationAccounts().catch(() => []),
      getProjects().catch(() => []),
      getProjectIntegrations().catch(() => []),
    ]);
    const resourceLists = await Promise.all(
      projects.map((p) => getProjectResources(p.id).catch(() => [])),
    );
    allResources = resourceLists.flat();
  }

  return (
    <SectionPage
      title="Resource Center"
      subtitle="Infrastructure & integrations"
      description="Company resource registry — repositories, Drive workspaces, databases, integrations, and execution readiness inputs."
    >
      <ResourceCenterView
        agents={agents}
        accounts={accounts}
        projects={projects}
        projectIntegrations={projectIntegrations}
        projectResources={allResources}
        oauthAvailable={{
          github: Boolean(process.env.GITHUB_CLIENT_ID),
          google_drive: Boolean(process.env.GOOGLE_CLIENT_ID),
        }}
      />
    </SectionPage>
  );
}
