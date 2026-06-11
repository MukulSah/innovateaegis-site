import { NextResponse } from "next/server";
import { getWorkflowApprovals } from "@/lib/sai/governance";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;
  const workflowId = searchParams.get("workflowId") ?? undefined;
  const projectId = searchParams.get("projectId") ?? undefined;

  try {
    const approvals = await getWorkflowApprovals({
      status: status as import("@/lib/sai/types").WorkflowApprovalStatus | undefined,
      workflowId,
      projectId,
    });
    return NextResponse.json({ approvals });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load approvals" },
      { status: 500 },
    );
  }
}
