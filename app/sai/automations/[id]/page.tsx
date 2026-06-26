import { AutomationEditorView } from "@/components/sai/automations/automation-editor-view";
import { SectionPage } from "@/components/sai/section-page";
import { getSession } from "@/lib/sai/api-auth";
import { getAgentAutomationById } from "@/lib/sai/agent-automations";
import { getLaunchAiOptions } from "@/lib/sai/launch-ai-options";
import { listGithubRepos } from "@/lib/sai/connectors/github-api";
import { getProjects } from "@/lib/sai/projects";
import { getToolRegistry } from "@/lib/sai/tool-permissions";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

export default async function AutomationDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();
  const isAdmin = session?.role === "owner" || session?.role === "admin";

  const automation = await getAgentAutomationById(id);
  if (!automation) notFound();

  const [repos, tools, launchOptions, projects] = await Promise.all([
    listGithubRepos().catch(() => []),
    getToolRegistry().catch(() => []),
    getLaunchAiOptions().catch(() => ({ options: [{ value: "auto", label: "Auto", description: "" }] })),
    getProjects().catch(() => []),
  ]);

  return (
    <SectionPage
      title={automation.name}
      subtitle="Automation editor"
      description="Configure triggers, instructions, tools, and repository scope."
    >
      <AutomationEditorView
        automation={automation}
        repos={repos}
        tools={tools}
        launchOptions={launchOptions.options}
        projects={projects.map((p) => ({ id: p.id, name: p.name }))}
        isAdmin={isAdmin}
      />
    </SectionPage>
  );
}
