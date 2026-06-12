import { ExecutionCenterView } from "@/components/sai/execution-center-view";
import { SectionPage } from "@/components/sai/section-page";
import { getExecutionCenterData } from "@/lib/sai/execution-center";

export default async function ExecutionPage() {
  let data = await getExecutionCenterData().catch(() => ({
    engineStatus: {
      orchestrator: "Offline",
      workflowEngine: "Offline",
      sessionManager: "Offline",
      contextEngine: "Offline",
    },
    activeSessions: [],
    stats: { activeWorkflows: 0, blockedTasks: 0, approvalsPending: 0 },
  }));

  return (
    <SectionPage
      title="Execution Center"
      subtitle="Session command"
      description="Monitor active sessions, engine status, agent turns, and approval gates."
    >
      <ExecutionCenterView data={data} />
    </SectionPage>
  );
}
