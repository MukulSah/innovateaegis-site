import { AIOperationsPanel } from "@/components/sai/ai-operations-panel";
import { ControlPanel } from "@/components/sai/control-panel";
import { ControlPanelLive } from "@/components/sai/control-panel-live";
import { SectionPage } from "@/components/sai/section-page";
import { getSession } from "@/lib/sai/api-auth";
import { getAgents } from "@/lib/sai/agents";
import { getAIOperationsMetrics } from "@/lib/sai/ai-operations";
import { getProjects } from "@/lib/sai/projects";
import { getTasks } from "@/lib/sai/tasks";
import { getRecentWorkflowEvents } from "@/lib/sai/workflow-events";
import { getControlPanelStats, getWorkflowRuns } from "@/lib/sai/workflows";
import type {
  Agent,
  AIOperationsMetrics,
  ControlPanelStats,
  Project,
  Task,
  WorkflowEvent,
  WorkflowRun,
} from "@/lib/sai/types";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function ControlPage() {
  const session = await getSession();
  const supabaseConfigured = isSupabaseConfigured();
  const isAdmin = session?.role === "owner";

  let stats: ControlPanelStats = {
    totalAgents: 0,
    activeAgents: 0,
    disabledAgents: 0,
    totalTasks: 0,
    blockedTasks: 0,
    inProgressTasks: 0,
    pendingApprovals: 0,
    activeWorkflows: 0,
    blockedWorkflows: 0,
    workflowCompletionRate: 0,
    generatedDocuments: 0,
    decisionsRecorded: 0,
    autoApprovedToday: 0,
    escalationsToday: 0,
    waitingForFounder: 0,
    waitingForRevision: 0,
    governanceHealth: 100,
  };
  let agents: Agent[] = [];
  let tasks: Task[] = [];
  let workflows: WorkflowRun[] = [];
  let projects: Project[] = [];
  let workflowEvents: WorkflowEvent[] = [];
  let aiOperations: AIOperationsMetrics = {
    connectedProviders: 0,
    runningAgents: 0,
    activeSessions: 0,
    failedExecutions: 0,
    dailyCost: 0,
    monthlyCost: 0,
    conversationCount: 0,
    mostActiveAgent: null,
    modelUsage: [],
    providers: [],
    recentSessions: [],
    recentConversations: [],
  };

  if (supabaseConfigured) {
    try {
      [stats, agents, tasks, workflows, projects, workflowEvents, aiOperations] = await Promise.all([
        getControlPanelStats(),
        getAgents(),
        getTasks(),
        getWorkflowRuns(),
        getProjects(),
        getRecentWorkflowEvents(30),
        getAIOperationsMetrics(),
      ]);
    } catch {
      // keep defaults
    }
  }

  return (
    <SectionPage
      title="Control Panel"
      subtitle="Owner command center"
      description="View all agents, workloads, blocked tasks, and SDLC workflows. Launch objectives, reassign work, pause agents, approve releases, and override execution."
    >
      {isAdmin && <AIOperationsPanel metrics={aiOperations} />}
      <ControlPanelLive>
      <ControlPanel
        stats={stats}
        agents={agents}
        tasks={tasks}
        workflows={workflows}
        projects={projects}
        workflowEvents={workflowEvents}
        isAdmin={isAdmin}
      />
      </ControlPanelLive>
    </SectionPage>
  );
}
