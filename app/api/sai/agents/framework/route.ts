import { NextResponse } from "next/server";
import { getSession } from "@/lib/sai/api-auth";
import { createCustomAgentFromArchetype, getAgentArchetypes, getCustomAgents } from "@/lib/sai/agent-archetypes";
import { getToolRegistry, getAgentToolPermissions, setAgentToolPermission } from "@/lib/sai/tool-permissions";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId");

  try {
    if (agentId) {
      const permissions = await getAgentToolPermissions(agentId);
      return NextResponse.json({ permissions });
    }

    const [archetypes, customAgents, tools] = await Promise.all([
      getAgentArchetypes(),
      getCustomAgents(),
      getToolRegistry(),
    ]);
    return NextResponse.json({ archetypes, customAgents, tools });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load agent framework data" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "owner") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  try {
    if (body.action === "create_from_archetype" && body.archetypeSlug) {
      const result = await createCustomAgentFromArchetype(body.archetypeSlug, {
        name: body.name,
        projectIds: body.projectIds,
      });
      return NextResponse.json(result, { status: 201 });
    }
    if (body.action === "set_permission" && body.agentId && body.toolKey) {
      await setAgentToolPermission(body.agentId, body.toolKey, body.allowed !== false);
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Agent framework action failed" },
      { status: 500 },
    );
  }
}
