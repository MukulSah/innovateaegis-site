import { ProjectMemoryView } from "@/components/sai/project-memory-view";
import { SectionPage } from "@/components/sai/section-page";
import { getProjectMemory } from "@/lib/sai/project-memory";
import { getProjects } from "@/lib/sai/projects";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function ProjectMemoryPage() {
  const projects = isSupabaseConfigured() ? await getProjects().catch(() => []) : [];
  const memoryByProject: Record<string, Awaited<ReturnType<typeof getProjectMemory>>> = {};

  if (isSupabaseConfigured()) {
    await Promise.all(
      projects.map(async (p) => {
        memoryByProject[p.id] = await getProjectMemory(p.id).catch(() => []);
      }),
    );
  }

  return (
    <SectionPage
      title="Project Memory"
      subtitle="Execution knowledge"
      description="Continuous project memory accumulated from session artifacts and agent turns."
    >
      <ProjectMemoryView projects={projects} memoryByProject={memoryByProject} />
    </SectionPage>
  );
}
