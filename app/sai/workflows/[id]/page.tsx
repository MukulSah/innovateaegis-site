import { SectionPage } from "@/components/sai/section-page";
import { WorkflowDetailView } from "@/components/sai/workflow-detail-view";
import { getSession } from "@/lib/sai/api-auth";
import { getWorkflowDetail } from "@/lib/sai/workflow-detail";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function WorkflowDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();

  if (!isSupabaseConfigured()) {
    return (
      <SectionPage title="Workflow" subtitle="Execution detail" description="">
        <p className="text-sm text-amber-200">Supabase is not configured.</p>
      </SectionPage>
    );
  }

  const detail = await getWorkflowDetail(id);
  if (!detail) notFound();

  return (
    <SectionPage
      title="Workflow Detail"
      subtitle="Single source of truth"
      description="Objective, requirements, architecture, tasks, assignments, documents, decisions, memories, and execution timeline."
    >
      <WorkflowDetailView detail={detail} isAdmin={session?.role === "owner"} />
    </SectionPage>
  );
}
