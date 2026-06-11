import { ExecutionBoardView } from "@/components/sai/execution-board-view";
import { SectionPage } from "@/components/sai/section-page";
import { getExecutionBoard } from "@/lib/sai/execution";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function ExecutionPage() {
  let board: Awaited<ReturnType<typeof getExecutionBoard>> = {
    activeWorkflows: 0,
    activeTasks: 0,
    blockedTasks: 0,
    reviewsPending: 0,
    approvalsPending: 0,
    deliverablesPending: 0,
    escalations: 0,
    releasesReady: 0,
    workflows: [],
    blockedTaskList: [],
    pendingReviews: [],
    pendingApprovals: [],
    pendingDeliverables: [],
    readyReleases: [],
  };

  if (isSupabaseConfigured()) {
    try {
      board = await getExecutionBoard();
    } catch {
      // keep empty
    }
  }

  return (
    <SectionPage
      title="Execution Board"
      subtitle="Work execution"
      description="Real-time view of active work, blocked items, pending reviews and approvals, deliverables, and releases ready to ship."
    >
      <ExecutionBoardView board={board} />
    </SectionPage>
  );
}
