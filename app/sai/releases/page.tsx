import { ReleasesView } from "@/components/sai/releases-view";
import { SectionPage } from "@/components/sai/section-page";
import { getSession } from "@/lib/sai/api-auth";
import { getProjects } from "@/lib/sai/projects";
import { getReleases } from "@/lib/sai/releases";
import type { Project, Release } from "@/lib/sai/types";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function ReleasesPage() {
  const session = await getSession();
  const supabaseConfigured = isSupabaseConfigured();
  let releases: Release[] = [];
  let projects: Project[] = [];

  if (supabaseConfigured) {
    try {
      [releases, projects] = await Promise.all([getReleases(), getProjects()]);
    } catch {
      releases = [];
      projects = [];
    }
  }

  return (
    <SectionPage
      title="Releases"
      subtitle="Deployment & delivery"
      description="The DevOps Agent handles infrastructure, CI/CD, monitoring, releases, and rollbacks. Every release is tracked and knowledge is archived."
    >
      <ReleasesView
        initialReleases={releases}
        projects={projects}
        isAdmin={session?.role === "owner"}
        supabaseConfigured={supabaseConfigured}
      />
    </SectionPage>
  );
}
