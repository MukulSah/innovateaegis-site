import { SettingsHubView, type SettingsTab } from "@/components/sai/settings-hub-view";
import { SectionPage } from "@/components/sai/section-page";
import { getAgents } from "@/lib/sai/agents";
import { getSession } from "@/lib/sai/api-auth";
import { getAIProviders } from "@/lib/sai/ai-providers";
import { getCompanyAISettings } from "@/lib/sai/ai-settings";
import { getCompanyAutomationSettings } from "@/lib/sai/automation-settings";
import { getIntegrationAccounts } from "@/lib/sai/connectors";
import { getProjectIntegrations } from "@/lib/sai/connectors/project-integrations";
import { getCurrentUser } from "@/lib/sai/current-user.server";
import { isFounder } from "@/lib/sai/current-user.types";
import { getApprovalPolicies, getGovernanceStats } from "@/lib/sai/governance";
import { getProjects } from "@/lib/sai/projects";
import { getProjectResources } from "@/lib/sai/project-resources";
import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";

const VALID_TABS = new Set<SettingsTab>(["governance", "ai", "resources", "integrations"]);

type Props = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function SettingsPage({ searchParams }: Props) {
  const { tab: rawTab } = await searchParams;
  const tab: SettingsTab =
    rawTab && VALID_TABS.has(rawTab as SettingsTab) ? (rawTab as SettingsTab) : "governance";

  const [session, currentUser] = await Promise.all([getSession(), getCurrentUser()]);
  const isAdmin = session?.role === "owner" || session?.role === "admin";
  const canEditAi = Boolean(currentUser && isFounder(currentUser.profile));

  let policies: Awaited<ReturnType<typeof getApprovalPolicies>> = [];
  let governanceProjects: { id: string; name: string; governance_profile: string; workflow_mode: string }[] =
    [];
  let stats = { governanceHealth: 0, pendingApprovals: 0, escalationsToday: 0 };

  let providers: Awaited<ReturnType<typeof getAIProviders>> = [];
  let aiSettings: Awaited<ReturnType<typeof getCompanyAISettings>> = {
    id: "",
    modelMode: "single",
    defaultProviderId: null,
    updatedAt: new Date().toISOString(),
  };

  let agents: Awaited<ReturnType<typeof getAgents>> = [];
  let accounts: Awaited<ReturnType<typeof getIntegrationAccounts>> = [];
  let projects: Awaited<ReturnType<typeof getProjects>> = [];
  let projectIntegrations: Awaited<ReturnType<typeof getProjectIntegrations>> = [];
  let allResources: Awaited<ReturnType<typeof getProjectResources>> = [];
  let automationSettings: Awaited<ReturnType<typeof getCompanyAutomationSettings>> = {
    id: "",
    bugbotEnabled: true,
    bugbotDefaults: {
      triggerMode: "every_push",
      reviewDraftPrs: false,
      prSummaries: true,
      autofixMode: "off",
      autofixSeverityThreshold: ["low", "medium", "high"],
      incrementalReview: false,
    },
    repositoryRules: [],
    updatedAt: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    try {
      const supabase = createSupabaseAdmin();
      [policies, stats, providers, aiSettings, agents, accounts, projects, projectIntegrations, automationSettings] =
        await Promise.all([
          getApprovalPolicies(),
          getGovernanceStats(),
          getAIProviders().catch(() => []),
          getCompanyAISettings().catch(() => aiSettings),
          getAgents().catch(() => []),
          getIntegrationAccounts().catch(() => []),
          getProjects().catch(() => []),
          getProjectIntegrations().catch(() => []),
          getCompanyAutomationSettings().catch(() => automationSettings),
        ]);

      const { data } = await supabase
        .from("projects")
        .select("id, name, governance_profile, workflow_mode");
      governanceProjects = data ?? [];

      const resourceLists = await Promise.all(
        projects.map((p) => getProjectResources(p.id).catch(() => [])),
      );
      allResources = resourceLists.flat();
    } catch {
      // keep defaults
    }
  }

  const tabTitles: Record<SettingsTab, { title: string; subtitle: string; description: string }> = {
    governance: {
      title: "Governance",
      subtitle: "Policy configuration",
      description:
        "Configure approval policies, governance profiles, workflow modes, and escalation rules. Set projects to Autonomous for hands-off session execution.",
    },
    ai: {
      title: "AI Providers",
      subtitle: "Founder AI configuration",
      description:
        "Configure AI providers, test connections, set the company default model, and control per-agent overrides.",
    },
    resources: {
      title: "Resources",
      subtitle: "Infrastructure & integrations",
      description:
        "Company resource registry — repositories, Drive workspaces, databases, integrations, and execution readiness inputs.",
    },
    integrations: {
      title: "Integrations",
      subtitle: "BugBot & automation",
      description:
        "Configure BugBot org defaults, repository rules, and connected GitHub/GitLab accounts.",
    },
  };

  const meta = tabTitles[tab];

  return (
    <SectionPage title={meta.title} subtitle={meta.subtitle} description={meta.description}>
      <SettingsHubView
        tab={tab}
        isAdmin={isAdmin}
        governance={{
          policies,
          projects: governanceProjects as Parameters<typeof SettingsHubView>[0]["governance"]["projects"],
          stats,
        }}
        ai={{
          providers,
          settings: aiSettings,
          canEdit: canEditAi,
        }}
        resources={{
          agents,
          accounts,
          projects,
          projectIntegrations,
          projectResources: allResources,
          oauthAvailable: {
            github: Boolean(process.env.GITHUB_CLIENT_ID),
            google_drive: Boolean(process.env.GOOGLE_CLIENT_ID),
          },
        }}
        integrations={{ automationSettings }}
      />
    </SectionPage>
  );
}
