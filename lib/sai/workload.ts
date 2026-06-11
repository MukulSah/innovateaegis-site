import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Agent, AgentCapacityStatus, AgentWorkload } from "./types";

function computeCapacityStatus(
  utilization: number,
  agentStatus: string,
  blockedCount: number,
): AgentCapacityStatus {
  if (agentStatus === "disabled") return "OFFLINE";
  if (blockedCount > 0) return "BLOCKED";
  if (utilization >= 90) return "OVERLOADED";
  if (utilization >= 60) return "BUSY";
  return "AVAILABLE";
}

export async function computeAgentWorkload(agent: Agent): Promise<AgentWorkload> {
  if (!isSupabaseConfigured()) {
    return {
      agentId: agent.id,
      agentName: agent.name,
      tasksCount: 0,
      reviewsCount: 0,
      approvalsCount: 0,
      deliverablesCount: 0,
      utilization: 0,
      capacityStatus: "AVAILABLE",
    };
  }

  const supabase = createSupabaseAdmin();

  const [tasks, reviews, approvals, deliverables, blockedTasks] = await Promise.all([
    supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("assigned_agent_id", agent.id)
      .not("status", "in", '("released","archived")'),
    supabase
      .from("reviews")
      .select("*", { count: "exact", head: true })
      .eq("reviewer", agent.name)
      .eq("status", "PENDING"),
    supabase
      .from("workflow_approvals")
      .select("*", { count: "exact", head: true })
      .eq("requested_by", agent.name)
      .eq("status", "pending"),
    supabase
      .from("deliverables")
      .select("*", { count: "exact", head: true })
      .eq("owner", agent.name)
      .not("status", "in", '("PUBLISHED","ARCHIVED")'),
    supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("assigned_agent_id", agent.id)
      .eq("status", "planning"),
  ]);

  const tasksCount = tasks.count ?? 0;
  const reviewsCount = reviews.count ?? 0;
  const approvalsCount = approvals.count ?? 0;
  const deliverablesCount = deliverables.count ?? 0;
  const blockedCount = blockedTasks.count ?? 0;

  const totalLoad = tasksCount + reviewsCount + approvalsCount + deliverablesCount;
  const utilization = Math.min(100, totalLoad * 15);

  const capacityStatus = computeCapacityStatus(utilization, agent.status, blockedCount);

  return {
    agentId: agent.id,
    agentName: agent.name,
    tasksCount,
    reviewsCount,
    approvalsCount,
    deliverablesCount,
    utilization,
    capacityStatus,
  };
}

export async function computeAllAgentWorkloads(agents: Agent[]): Promise<AgentWorkload[]> {
  return Promise.all(agents.map((agent) => computeAgentWorkload(agent)));
}

export async function syncAgentCapacityStatuses(agents: Agent[]): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const supabase = createSupabaseAdmin();
  const workloads = await computeAllAgentWorkloads(agents);

  for (const workload of workloads) {
    await supabase
      .from("agents")
      .update({ capacity_status: workload.capacityStatus.toLowerCase() })
      .eq("id", workload.agentId);
  }
}

export async function getAverageUtilization(agents: Agent[]): Promise<number> {
  if (agents.length === 0) return 0;
  const workloads = await computeAllAgentWorkloads(agents);
  return Math.round(
    workloads.reduce((sum, w) => sum + w.utilization, 0) / workloads.length,
  );
}
