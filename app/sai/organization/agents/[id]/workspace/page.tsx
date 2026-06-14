import { notFound, redirect } from "next/navigation";
import { AgentDesignationWorkspaceView } from "@/components/sai/agent-designation-workspace-view";
import { getSession } from "@/lib/sai/api-auth";
import { getAgents } from "@/lib/sai/agents";
import { getAgentWorkspace } from "@/lib/sai/agent-workspace";
import { getAgentSessionHistory } from "@/lib/sai/organization-headquarters";
import { getAIProviders } from "@/lib/sai/ai-providers";
import { getCompanyAISettings } from "@/lib/sai/ai-settings";
import { isSupabaseConfigured } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }> };

export default async function OrganizationAgentWorkspacePage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();

  if (!isSupabaseConfigured()) {
    notFound();
  }

  let workspace: Awaited<ReturnType<typeof getAgentWorkspace>> = null;
  let sessionHistory: Awaited<ReturnType<typeof getAgentSessionHistory>> = [];
  let modelMode: Awaited<ReturnType<typeof getCompanyAISettings>>["modelMode"] = "single";
  let providers: Awaited<ReturnType<typeof getAIProviders>> = [];
  let agents: Awaited<ReturnType<typeof getAgents>> = [];

  try {
    [workspace, sessionHistory, { modelMode }, providers, agents] = await Promise.all([
      getAgentWorkspace(id),
      getAgentSessionHistory(id),
      getCompanyAISettings(),
      getAIProviders(),
      getAgents(),
    ]);
  } catch {
    notFound();
  }

  if (!workspace) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-7xl">
      <AgentDesignationWorkspaceView
        workspace={workspace}
        sessionHistory={sessionHistory}
        isAdmin={session?.role === "owner"}
        modelMode={modelMode}
        providers={providers}
        agents={agents}
      />
    </div>
  );
}
