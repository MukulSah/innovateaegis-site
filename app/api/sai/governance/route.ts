import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireOwner } from "@/lib/sai/api-auth";
import { getApprovalPolicies, getGovernanceStats, updateApprovalPolicy } from "@/lib/sai/governance";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 503 });
  }

  try {
    const [policies, stats] = await Promise.all([getApprovalPolicies(), getGovernanceStats()]);
    const supabase = createSupabaseAdmin();
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name, governance_profile, workflow_mode");
    return NextResponse.json({ policies, stats, projects: projects ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load governance" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  if (!(await requireOwner())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const supabase = createSupabaseAdmin();

  if (typeof body.policyId === "string" && body.mode) {
    const policy = await updateApprovalPolicy(body.policyId, {
      mode: body.mode,
      active: body.active,
      approverRole: body.approverRole,
    });
    revalidatePath("/sai/governance");
    return NextResponse.json({ policy });
  }

  if (typeof body.projectId === "string") {
    const updates: Record<string, string> = {};
    if (body.governanceProfile) updates.governance_profile = body.governanceProfile;
    if (body.workflowMode) updates.workflow_mode = body.workflowMode;
    const { data, error } = await supabase
      .from("projects")
      .update(updates)
      .eq("id", body.projectId)
      .select("id, name, governance_profile, workflow_mode")
      .single();
    if (error) throw new Error(error.message);
    revalidatePath("/sai/governance");
    revalidatePath("/sai/projects");
    return NextResponse.json({ project: data });
  }

  return NextResponse.json({ error: "Invalid update" }, { status: 400 });
}
