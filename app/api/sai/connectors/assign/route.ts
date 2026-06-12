import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireFounder } from "@/lib/sai/api-auth";
import { assignIntegrationToProject } from "@/lib/sai/connectors/project-integrations";

export async function POST(request: Request) {
  const user = await requireFounder();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const projectId = typeof body.projectId === "string" ? body.projectId : "";
  const integrationAccountId =
    typeof body.integrationAccountId === "string" ? body.integrationAccountId : "";
  const config = typeof body.config === "object" && body.config ? body.config : {};

  if (!projectId || !integrationAccountId) {
    return NextResponse.json(
      { error: "projectId and integrationAccountId are required" },
      { status: 400 },
    );
  }

  try {
    const result = await assignIntegrationToProject({
      projectId,
      integrationAccountId,
      config,
    });
    const { syncIntegrationsToResources } = await import("@/lib/sai/project-resources");
    await syncIntegrationsToResources(projectId);
    revalidatePath("/sai/resources");
    revalidatePath("/sai/founder");
    return NextResponse.json({ integration: result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to assign" },
      { status: 500 },
    );
  }
}
