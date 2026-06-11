import { ApprovalsView } from "@/components/sai/approvals-view";
import { SectionPage } from "@/components/sai/section-page";
import { getSession } from "@/lib/sai/api-auth";
import { getWorkflowApprovals } from "@/lib/sai/governance";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function ApprovalsPage() {
  const session = await getSession();
  let approvals: Awaited<ReturnType<typeof getWorkflowApprovals>> = [];

  if (isSupabaseConfigured()) {
    try {
      approvals = await getWorkflowApprovals();
    } catch {
      approvals = [];
    }
  }

  return (
    <SectionPage
      title="Approval Center"
      subtitle="Governance queue"
      description="Review requirements, architecture, releases, and escalated actions. Approve, reject, request revision, or escalate to founder."
    >
      <ApprovalsView initialApprovals={approvals} isAdmin={session?.role === "owner"} />
    </SectionPage>
  );
}
