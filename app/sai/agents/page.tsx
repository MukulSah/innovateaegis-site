import { AgentsView } from "@/components/sai/agents-view";
import { SectionPage } from "@/components/sai/section-page";
import { getAgentMetrics } from "@/lib/sai/agent-metrics";
import { getAgents } from "@/lib/sai/agents";
import { getCurrentUser } from "@/lib/sai/current-user.server";
import { isAdminOrFounder } from "@/lib/sai/current-user.types";
import { getFounderDisplayName } from "@/lib/sai/founder";
import { getProjects } from "@/lib/sai/projects";
import { syncAgentCapacityStatuses } from "@/lib/sai/workload";
import type { Agent, Project } from "@/lib/sai/types";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function AgentsPage() {
  const currentUser = await getCurrentUser();
  const supabaseConfigured = isSupabaseConfigured();
  let agents: Agent[] = [];
  let projects: Project[] = [];
  let founderName = "Founder";

  if (supabaseConfigured) {
    try {
      const [dbAgents, dbProjects, metrics, founder] = await Promise.all([
        getAgents(),
        getProjects(),
        getAgentMetrics(),
        getFounderDisplayName(),
      ]);
      founderName = founder;
      const metricsMap = new Map(metrics.map((m) => [m.agentId, m.scores]));
      await syncAgentCapacityStatuses(dbAgents);
      const refreshedAgents = await getAgents();
      agents = refreshedAgents.map((a) => ({
        ...a,
        metrics: metricsMap.get(a.id),
      }));
      projects = dbProjects;
    } catch {
      agents = [];
      projects = [];
    }
  }

  return (
    <SectionPage
      title="Agent Factory"
      subtitle="Digital Employee Management"
      description="Define digital employees — identity, personality, responsibilities, brain access, and permissions. Agent Factory manages who your agents are, not what they remember. Memory lives in Organizational Memory and Company Brain."
    >
      <AgentsView
        initialAgents={agents}
        projects={projects}
        isAdmin={isAdminOrFounder(currentUser?.profile)}
        founderName={founderName}
        supabaseConfigured={supabaseConfigured}
      />
    </SectionPage>
  );
}
