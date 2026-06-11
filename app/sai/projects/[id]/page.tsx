import { ProjectDashboardView } from "@/components/sai/project-dashboard-view";
import { SectionPage } from "@/components/sai/section-page";
import { getSession } from "@/lib/sai/api-auth";
import { getProjectDashboard } from "@/lib/sai/project-dashboard";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();

  if (!isSupabaseConfigured()) {
    notFound();
  }

  const dashboard = await getProjectDashboard(id);
  if (!dashboard) {
    notFound();
  }

  return (
    <SectionPage
      title="Project Dashboard"
      subtitle={dashboard.project.name}
      description="Complete lifecycle from idea to deployment — objectives, workflows, tasks, approvals, memory, and deliverables."
    >
      <ProjectDashboardView
        dashboard={dashboard}
        isAdmin={session?.role === "owner"}
      />
    </SectionPage>
  );
}
