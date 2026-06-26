import { AutomationsHubView } from "@/components/sai/automations/automations-hub-view";
import { SectionPage } from "@/components/sai/section-page";
import { getSession } from "@/lib/sai/api-auth";
import {
  AUTOMATION_TEMPLATES,
  getAgentAutomations,
  getAutomationRunStats,
} from "@/lib/sai/agent-automations";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function AutomationsPage() {
  const session = await getSession();
  const isAdmin = session?.role === "owner" || session?.role === "admin";

  let automations: Awaited<ReturnType<typeof getAgentAutomations>> = [];
  let stats = { total: 0, successful: 0, failed: 0 };

  if (isSupabaseConfigured()) {
    [automations, stats] = await Promise.all([
      getAgentAutomations().catch(() => []),
      getAutomationRunStats(7).catch(() => ({ total: 0, successful: 0, failed: 0 })),
    ]);
  }

  return (
    <SectionPage
      title="Automations"
      subtitle="Agent automations"
      description="Automate repetitive tasks with always-on agents that respond to schedules and repository triggers."
    >
      <AutomationsHubView
        automations={automations}
        stats={stats}
        templates={AUTOMATION_TEMPLATES}
        isAdmin={isAdmin}
      />
    </SectionPage>
  );
}
