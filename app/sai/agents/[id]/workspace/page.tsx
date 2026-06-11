import { notFound } from "next/navigation";
import { AgentWorkspaceView } from "@/components/sai/agent-workspace-view";
import { SectionPage } from "@/components/sai/section-page";
import { getSession } from "@/lib/sai/api-auth";
import { getAgents } from "@/lib/sai/agents";
import { getAgentWorkspace } from "@/lib/sai/agent-workspace";
import { getAIProviders } from "@/lib/sai/ai-providers";
import { getCompanyAISettings } from "@/lib/sai/ai-settings";
import { isSupabaseConfigured } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }> };

export default async function AgentWorkspacePage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();

  if (!isSupabaseConfigured()) {
    notFound();
  }

  let workspace: Awaited<ReturnType<typeof getAgentWorkspace>> = null;
  let modelMode: Awaited<ReturnType<typeof getCompanyAISettings>>["modelMode"] = "single";
  let providers: Awaited<ReturnType<typeof getAIProviders>> = [];
  let agents: Awaited<ReturnType<typeof getAgents>> = [];

  try {
    [workspace, { modelMode }, providers, agents] = await Promise.all([
      getAgentWorkspace(id),
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
    <SectionPage
      title={`${workspace.agent.name} Workspace`}
      subtitle="Agent workspace"
      description="Assigned tasks, work queue, knowledge contributions, collaboration, and performance metrics for this agent."
    >
      <AgentWorkspaceView
        workspace={workspace}
        isAdmin={session?.role === "owner"}
        modelMode={modelMode}
        providers={providers}
        agents={agents}
      />
    </SectionPage>
  );
}
