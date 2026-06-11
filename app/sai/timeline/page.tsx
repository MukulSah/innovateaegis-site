import { SectionPage } from "@/components/sai/section-page";
import { TimelineView } from "@/components/sai/timeline-view";
import { getCompanyTimeline } from "@/lib/sai/company-timeline";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function TimelinePage() {
  let events: Awaited<ReturnType<typeof getCompanyTimeline>> = [];

  if (isSupabaseConfigured()) {
    try {
      events = await getCompanyTimeline({ limit: 100 });
    } catch {
      events = [];
    }
  }

  return (
    <SectionPage
      title="Company Timeline"
      subtitle="Organizational history"
      description="The permanent memory of InnovateAegis — workflows, approvals, decisions, releases, and every significant company action."
    >
      <TimelineView initialEvents={events} />
    </SectionPage>
  );
}
