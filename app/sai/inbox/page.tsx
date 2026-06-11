import { InboxView } from "@/components/sai/inbox-view";
import { SectionPage } from "@/components/sai/section-page";
import { getActivityFeed } from "@/lib/sai/activity-feed";
import { getSession } from "@/lib/sai/api-auth";
import { getInboxNotificationsWithLinks } from "@/lib/sai/notifications";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function InboxPage() {
  const session = await getSession();
  let inbox = {
    all: [] as Awaited<ReturnType<typeof getInboxNotificationsWithLinks>>["all"],
    unread: [] as Awaited<ReturnType<typeof getInboxNotificationsWithLinks>>["unread"],
    approvals: [] as Awaited<ReturnType<typeof getInboxNotificationsWithLinks>>["approvals"],
    assignments: [] as Awaited<ReturnType<typeof getInboxNotificationsWithLinks>>["assignments"],
    mentions: [] as Awaited<ReturnType<typeof getInboxNotificationsWithLinks>>["mentions"],
    escalations: [] as Awaited<ReturnType<typeof getInboxNotificationsWithLinks>>["escalations"],
    workflowEvents: [] as Awaited<ReturnType<typeof getInboxNotificationsWithLinks>>["workflowEvents"],
    completedWork: [] as Awaited<ReturnType<typeof getInboxNotificationsWithLinks>>["completedWork"],
    recentActivity: [] as Awaited<ReturnType<typeof getInboxNotificationsWithLinks>>["recentActivity"],
  };
  let activityFeed: Awaited<ReturnType<typeof getActivityFeed>> = [];

  if (isSupabaseConfigured()) {
    try {
      [inbox, activityFeed] = await Promise.all([
        getInboxNotificationsWithLinks(),
        getActivityFeed(30),
      ]);
    } catch {
      // keep empty
    }
  }

  return (
    <SectionPage
      title="SAI Inbox"
      subtitle="Execution notifications"
      description="Approvals, assignments, mentions, escalations, workflow events, and completed work — all in one place."
    >
      <InboxView
        inbox={inbox}
        activityFeed={activityFeed}
        isAdmin={session?.role === "owner"}
      />
    </SectionPage>
  );
}
