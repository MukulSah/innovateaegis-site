import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { displayName, requireFounder } from "@/lib/sai/api-auth";
import { addTimelineEvent } from "@/lib/sai/project-timeline";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type Ctx = { params: Promise<{ id: string; approvalId: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const user = await requireFounder();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const actorName = displayName(user.profile);

  const { id: projectId, approvalId } = await params;
  const body = await request.json();
  const status = body.status as "approved" | "rejected";

  if (status !== "approved" && status !== "rejected") {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("project_approvals")
    .update({ status, decided_at: new Date().toISOString(), approver_name: actorName })
    .eq("id", approvalId)
    .eq("project_id", projectId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await addTimelineEvent({
    projectId,
    eventType: "approval_decided",
    title: `${data.approval_type} approval ${status}`,
    description: typeof body.notes === "string" ? body.notes : "",
    actorName,
    metadata: { approvalId, status },
  });

  revalidatePath(`/sai/projects/${projectId}`);
  return NextResponse.json({ approval: data });
}
