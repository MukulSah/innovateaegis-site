import { NextResponse } from "next/server";
import { requireFounder } from "@/lib/sai/api-auth";
import { getApprovalHistory } from "@/lib/sai/approval-history";
import { getCompanyExecutiveTimeline } from "@/lib/sai/executive-timeline";

export async function GET(request: Request) {
  if (!(await requireFounder())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const workflowId = searchParams.get("workflowId") ?? undefined;
  const projectId = searchParams.get("projectId") ?? undefined;
  const view = searchParams.get("view");

  try {
    if (view === "executive") {
      const timeline = await getCompanyExecutiveTimeline(100);
      return NextResponse.json({ timeline });
    }

    const history = await getApprovalHistory({
      workflowId,
      projectId,
      limit: 100,
    });
    return NextResponse.json({ history });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load history" },
      { status: 500 },
    );
  }
}
