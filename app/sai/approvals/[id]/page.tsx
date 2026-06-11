import { ApprovalDetailView } from "@/components/sai/approval-detail-view";
import { SectionPage } from "@/components/sai/section-page";
import { getSession } from "@/lib/sai/api-auth";
import { getApprovalComments, getWorkflowApprovalById } from "@/lib/sai/governance";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function ApprovalDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();

  if (!isSupabaseConfigured()) notFound();
  const approval = await getWorkflowApprovalById(id);
  if (!approval) notFound();
  const comments = await getApprovalComments(id);

  return (
    <SectionPage title="Approval Detail" subtitle="Governance review" description="">
      <ApprovalDetailView approval={approval} comments={comments} isAdmin={session?.role === "owner"} />
    </SectionPage>
  );
}
