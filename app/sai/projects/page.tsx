import { SectionPage } from "@/components/sai/section-page";
import { ProjectsView } from "@/components/sai/projects-view";
import { getSession } from "@/lib/sai/api-auth";
import { getAgents } from "@/lib/sai/agents";
import { getEmployees } from "@/lib/sai/employees";
import { getProjects } from "@/lib/sai/projects";
import type { Agent, Employee, Project } from "@/lib/sai/types";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function ProjectsPage() {
  const session = await getSession();
  const supabaseConfigured = isSupabaseConfigured();

  let projects: Project[] = [];
  let agents: Agent[] = [];
  let employees: Employee[] = [];

  if (supabaseConfigured) {
    try {
      [projects, agents, employees] = await Promise.all([
        getProjects(),
        getAgents(),
        getEmployees(),
      ]);
    } catch {
      projects = [];
      agents = [];
      employees = [];
    }
  }

  return (
    <SectionPage
      title="Projects"
      subtitle="Objective-driven execution"
      description="Business Owner accountability with Project Lead execution. Add objectives to auto-launch SDLC workflows."
    >
      <ProjectsView
        initialProjects={projects}
        agents={agents}
        employees={employees}
        isAdmin={session?.role === "owner"}
        supabaseConfigured={supabaseConfigured}
      />
    </SectionPage>
  );
}
