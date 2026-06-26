import { NextResponse } from "next/server";
import { getSession } from "@/lib/sai/api-auth";
import {
  createAgentAutomation,
  getAgentAutomations,
  getAutomationRunStats,
  AUTOMATION_TEMPLATES,
} from "@/lib/sai/agent-automations";
import { listGithubRepos } from "@/lib/sai/connectors/github-api";
import { getToolRegistry } from "@/lib/sai/tool-permissions";
import { getLaunchAiOptions } from "@/lib/sai/launch-ai-options";
import { getProjects } from "@/lib/sai/projects";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [automations, stats, repos, tools, launchOptions, projects] = await Promise.all([
      getAgentAutomations(),
      getAutomationRunStats(7),
      listGithubRepos().catch(() => []),
      getToolRegistry().catch(() => []),
      getLaunchAiOptions().catch(() => null),
      getProjects().catch(() => []),
    ]);

    return NextResponse.json({
      automations,
      stats,
      templates: AUTOMATION_TEMPLATES,
      repos,
      tools,
      launchOptions,
      projects,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load automations" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || (session.role !== "owner" && session.role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  try {
    if (body.templateId) {
      const template = AUTOMATION_TEMPLATES.find((t) => t.id === body.templateId);
      if (!template) return NextResponse.json({ error: "Unknown template" }, { status: 400 });

      const automation = await createAgentAutomation({
        name: body.name ?? template.name,
        description: template.description,
        automationKind: template.kind,
        instructions: template.instructions,
        templateSlug: template.templateSlug,
        triggers: template.triggers.map((t) =>
          t.type === "git" ? { ...t, repos: [...t.repos] } : { ...t },
        ),
        tools: template.tools.map((t) => ({ ...t })),
        preferences: { ...template.preferences },
        projectId: body.projectId ?? null,
        authorUserId: session.id ?? null,
        status: "draft",
      });
      return NextResponse.json({ automation });
    }

    const automation = await createAgentAutomation({
      name: body.name ?? "New Automation",
      description: body.description,
      status: body.status,
      automationKind: body.automationKind,
      instructions: body.instructions,
      modelSelection: body.modelSelection,
      memoryEnabled: body.memoryEnabled,
      triggers: body.triggers,
      tools: body.tools,
      repositoryScope: body.repositoryScope,
      preferences: body.preferences,
      templateSlug: body.templateSlug,
      projectId: body.projectId,
      authorUserId: session.id ?? null,
      timezone: body.timezone,
    });

    return NextResponse.json({ automation });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create automation" },
      { status: 500 },
    );
  }
}
