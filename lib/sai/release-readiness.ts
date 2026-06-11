import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import type { ReleaseReadiness } from "./types";

export async function computeReleaseReadiness(projectId: string): Promise<ReleaseReadiness> {
  const empty: ReleaseReadiness = {
    score: 0,
    tasksComplete: 0,
    tasksTotal: 0,
    deliverablesApproved: 0,
    deliverablesTotal: 0,
    reviewsPassed: 0,
    reviewsTotal: 0,
    approvalsCompleted: 0,
    approvalsTotal: 0,
    risksClosed: 0,
    risksTotal: 0,
  };

  if (!isSupabaseConfigured()) return empty;

  const supabase = createSupabaseAdmin();

  const [tasks, deliverables, reviews, approvals, risks] = await Promise.all([
    supabase.from("tasks").select("status").eq("project_id", projectId),
    supabase.from("deliverables").select("status").eq("project_id", projectId),
    supabase.from("reviews").select("status").eq("entity_type", "deliverable"),
    supabase.from("workflow_approvals").select("status").eq("project_id", projectId),
    supabase
      .from("memories")
      .select("id")
      .eq("project_id", projectId)
      .eq("type", "risk"),
  ]);

  const taskRows = tasks.data ?? [];
  const deliverableRows = deliverables.data ?? [];
  const reviewRows = reviews.data ?? [];
  const approvalRows = approvals.data ?? [];
  const riskRows = risks.data ?? [];

  const tasksComplete = taskRows.filter((t) =>
    ["released", "archived"].includes(t.status as string),
  ).length;
  const tasksTotal = taskRows.length;

  const deliverablesApproved = deliverableRows.filter((d) =>
    ["APPROVED", "PUBLISHED"].includes(d.status as string),
  ).length;
  const deliverablesTotal = deliverableRows.length;

  const reviewsPassed = reviewRows.filter((r) => r.status === "APPROVED").length;
  const reviewsTotal = reviewRows.length;

  const approvalsCompleted = approvalRows.filter((r) =>
    ["approved", "auto_approved"].includes(r.status as string),
  ).length;
  const approvalsTotal = approvalRows.length;

  const risksTotal = riskRows.length;
  const risksClosed = 0;

  const weights = [
    tasksTotal > 0 ? (tasksComplete / tasksTotal) * 30 : 30,
    deliverablesTotal > 0 ? (deliverablesApproved / deliverablesTotal) * 25 : 25,
    reviewsTotal > 0 ? (reviewsPassed / reviewsTotal) * 20 : 20,
    approvalsTotal > 0 ? (approvalsCompleted / approvalsTotal) * 15 : 15,
    risksTotal > 0 ? (risksClosed / risksTotal) * 10 : 10,
  ];

  const score = Math.round(weights.reduce((sum, w) => sum + w, 0));

  return {
    score,
    tasksComplete,
    tasksTotal,
    deliverablesApproved,
    deliverablesTotal,
    reviewsPassed,
    reviewsTotal,
    approvalsCompleted,
    approvalsTotal,
    risksClosed,
    risksTotal,
  };
}
