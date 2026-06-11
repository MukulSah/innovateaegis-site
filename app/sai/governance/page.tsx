import { GovernanceView } from "@/components/sai/governance-view";
import { SectionPage } from "@/components/sai/section-page";
import { getSession } from "@/lib/sai/api-auth";
import { getApprovalPolicies, getGovernanceStats } from "@/lib/sai/governance";
import { createSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";

export default async function GovernancePage() {
  const session = await getSession();
  let policies: Awaited<ReturnType<typeof getApprovalPolicies>> = [];
  let projects: { id: string; name: string; governance_profile: string; workflow_mode: string }[] = [];
  let stats = { governanceHealth: 0, pendingApprovals: 0, escalationsToday: 0 };

  if (isSupabaseConfigured()) {
    try {
      const supabase = createSupabaseAdmin();
      [policies, stats] = await Promise.all([getApprovalPolicies(), getGovernanceStats()]);
      const { data } = await supabase.from("projects").select("id, name, governance_profile, workflow_mode");
      projects = data ?? [];
    } catch {
      // defaults
    }
  }

  return (
    <SectionPage
      title="Governance Center"
      subtitle="Policy configuration"
      description="Configure approval policies, governance profiles, workflow modes, and escalation rules. No code changes required."
    >
      <GovernanceView
        policies={policies}
        projects={projects as Parameters<typeof GovernanceView>[0]["projects"]}
        stats={stats}
        isAdmin={session?.role === "owner"}
      />
    </SectionPage>
  );
}
