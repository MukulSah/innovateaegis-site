import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { getAgentAIConfig } from "./agent-ai-config";
import { getAgentHandoffs } from "./agent-handoffs";
import { getAgentSessionHandoffs } from "./coo-routing";
import { getWorkflowConversations } from "./agent-conversations";
import { getAgentRuntimeSessions } from "./agent-runtime";
import { getActivityFeedByActor } from "./activity-feed";
import { getAgentById, getAgentMemory } from "./agents";
import { getAgentMetrics } from "./agent-metrics";
import { getDecisions } from "./decisions";
import { getDocuments } from "./documents";
import { getRecentDiscussions } from "./discussions";
import { getWorkflowApprovals } from "./governance";
import { getTasks } from "./tasks";
import { computeAgentWorkload } from "./workload";
import type { AgentWorkspace, Task } from "./types";

function partitionWorkQueue(tasks: Task[]) {
  const now = Date.now();
  const threeDays = 3 * 24 * 60 * 60 * 1000;

  return {
    backlog: tasks.filter((t) => t.status === "backlog" || t.status === "ready"),
    inProgress: tasks.filter((t) =>
      ["assigned", "in_progress", "code_review", "testing"].includes(t.status),
    ),
    blocked: tasks.filter((t) => t.status === "planning" || t.approvalStatus === "rejected"),
    review: tasks.filter((t) => t.status === "approval" || t.status === "code_review"),
    completed: tasks.filter((t) => ["released", "archived"].includes(t.status)),
    dueSoon: tasks.filter((t) => {
      if (!t.dueDate) return false;
      const due = new Date(t.dueDate).getTime();
      return due > now && due - now <= threeDays && !["released", "archived"].includes(t.status);
    }),
    overdue: tasks.filter((t) => {
      if (!t.dueDate) return false;
      return new Date(t.dueDate).getTime() < now && !["released", "archived"].includes(t.status);
    }),
  };
}

export async function getAgentWorkspace(agentId: string): Promise<AgentWorkspace | null> {
  const agent = await getAgentById(agentId);
  if (!agent) return null;

  if (!isSupabaseConfigured()) {
    return {
      agent,
      assignedTasks: [],
      pendingApprovals: [],
      documentsCreated: [],
      memoriesCreated: [],
      openDiscussions: [],
      runtimeSessions: [],
      conversations: [],
      handoffs: [],
      sessionHandoffs: [],
      aiConfig: null,
      workload: await computeAgentWorkload(agent),
      metrics: null,
      recentActivity: [],
      workQueue: {
        backlog: [],
        inProgress: [],
        blocked: [],
        review: [],
        completed: [],
        dueSoon: [],
        overdue: [],
      },
      knowledge: {
        memories: [],
        decisions: [],
        documents: [],
        workflowContributions: 0,
        approvalHistory: [],
      },
    };
  }

  const supabase = createSupabaseAdmin();
  const allTasks = await getTasks();
  const assignedTasks = allTasks.filter((t) => t.assignedAgentId === agentId);

  const [allApprovals, allDocuments, memories, allDecisions, metricsList, discussions, runtimeSessions, aiConfig, handoffs, sessionHandoffs] =
    await Promise.all([
      getWorkflowApprovals(),
      getDocuments(),
      getAgentMemory(agentId),
      getDecisions(),
      getAgentMetrics(),
      getRecentDiscussions(50),
      getAgentRuntimeSessions(agentId, 10),
      getAgentAIConfig(agentId),
      getAgentHandoffs(agentId, 10),
      getAgentSessionHandoffs(agentId, 20),
    ]);

  const pendingApprovals = allApprovals.filter(
    (a) => a.requestedBy === agent.name && a.status === "pending",
  );
  const documentsCreated = allDocuments.filter((d) => d.createdBy === agent.name);
  const decisions = allDecisions.filter((d) => d.createdBy === agent.name);
  const approvalHistory = allApprovals.filter((a) => a.requestedBy === agent.name);

  const { count: workflowContributions } = await supabase
    .from("workflow_run_steps")
    .select("*", { count: "exact", head: true })
    .eq("assigned_agent_id", agentId);

  const agentDiscussions = discussions.filter((d) => d.author === agent.name);

  const workflowIds = [...new Set(assignedTasks.map((t) => t.workflowRunId).filter(Boolean))] as string[];
  const conversationBatches = await Promise.all(
    workflowIds.slice(0, 5).map((wfId) => getWorkflowConversations(wfId)),
  );
  const conversations = conversationBatches
    .flat()
    .filter((c) => c.senderAgentId === agentId || c.receiverAgentId === agentId);

  const workload = await computeAgentWorkload(agent);
  const metrics = metricsList.find((m) => m.agentId === agentId) ?? null;
  const recentActivity = await getActivityFeedByActor(agent.name, 15);

  return {
    agent: { ...agent, capacityStatus: workload.capacityStatus },
    assignedTasks,
    pendingApprovals,
    documentsCreated,
    memoriesCreated: memories,
    openDiscussions: agentDiscussions,
    runtimeSessions,
    conversations,
    handoffs,
    sessionHandoffs,
    aiConfig,
    workload,
    metrics,
    recentActivity,
    workQueue: partitionWorkQueue(assignedTasks),
    knowledge: {
      memories,
      decisions,
      documents: documentsCreated,
      workflowContributions: workflowContributions ?? 0,
      approvalHistory,
    },
  };
}
