"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AISettingsView } from "@/components/sai/ai-settings-view";
import { GovernanceView } from "@/components/sai/governance-view";
import { ResourceCenterView } from "@/components/sai/resource-center-view";
import { BugbotSettingsPanel } from "@/components/sai/automations/bugbot-settings-panel";
import type { CompanyAutomationSettings } from "@/lib/sai/automation-settings";
import type { ProjectIntegration } from "@/lib/sai/connectors/project-integrations";
import type { ProjectResource } from "@/lib/sai/project-resources";
import type {
  Agent,
  AIProvider,
  ApprovalPolicy,
  CompanyAISettings,
  GovernanceProfile,
  IntegrationAccount,
  Project,
  WorkflowMode,
} from "@/lib/sai/types";

export type SettingsTab = "governance" | "ai" | "resources" | "integrations";

type ProjectGovernance = {
  id: string;
  name: string;
  governance_profile: GovernanceProfile;
  workflow_mode: WorkflowMode;
};

type Props = {
  tab: SettingsTab;
  isAdmin: boolean;
  governance: {
    policies: ApprovalPolicy[];
    projects: ProjectGovernance[];
    stats: {
      governanceHealth: number;
      pendingApprovals: number;
      escalationsToday: number;
    };
  };
  ai: {
    providers: AIProvider[];
    settings: CompanyAISettings;
    canEdit: boolean;
  };
  resources: {
    agents: Agent[];
    accounts: IntegrationAccount[];
    projects: Project[];
    projectIntegrations: ProjectIntegration[];
    projectResources: ProjectResource[];
    oauthAvailable: { github: boolean; google_drive: boolean };
  };
  integrations?: {
    automationSettings: CompanyAutomationSettings;
  };
};

const TABS: { id: SettingsTab; label: string; description: string }[] = [
  {
    id: "governance",
    label: "Governance",
    description: "Approval policies, project profiles, and workflow modes",
  },
  {
    id: "ai",
    label: "AI Providers",
    description: "Models, API keys, and company default AI configuration",
  },
  {
    id: "resources",
    label: "Resources",
    description: "Repositories, integrations, and infrastructure links",
  },
  {
    id: "integrations",
    label: "Integrations",
    description: "BugBot defaults, repository rules, and automation integrations",
  },
];

export function SettingsHubView({ tab, isAdmin, governance, ai, resources, integrations }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function selectTab(next: SettingsTab) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.push(`/sai/settings?${params.toString()}`);
  }

  const activeMeta = TABS.find((t) => t.id === tab) ?? TABS[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => selectTab(item.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              tab === item.id
                ? "bg-purple-500/20 text-purple-100 ring-1 ring-purple-400/30"
                : "text-white/55 hover:bg-white/5 hover:text-white"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-white/45">{activeMeta.description}</p>

      {tab === "governance" && (
        <GovernanceView
          policies={governance.policies}
          projects={governance.projects}
          stats={governance.stats}
          isAdmin={isAdmin}
        />
      )}

      {tab === "ai" &&
        (ai.canEdit ? (
          <AISettingsView providers={ai.providers} settings={ai.settings} isAdmin={isAdmin} />
        ) : (
          <section className="enterprise-glass rounded-xl border border-amber-400/20 bg-amber-500/5 p-5 text-sm text-amber-100/90">
            AI provider configuration is restricted to the company founder.
            <Link href="/sai/founder" className="ml-1 text-purple-300 hover:underline">
              Return to Founder Workspace
            </Link>
          </section>
        ))}

      {tab === "resources" && (
        <ResourceCenterView
          agents={resources.agents}
          accounts={resources.accounts}
          projects={resources.projects}
          projectIntegrations={resources.projectIntegrations}
          projectResources={resources.projectResources}
          oauthAvailable={resources.oauthAvailable}
        />
      )}

      {tab === "integrations" && integrations && (
        <BugbotSettingsPanel
          settings={integrations.automationSettings}
          accounts={resources.accounts}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
