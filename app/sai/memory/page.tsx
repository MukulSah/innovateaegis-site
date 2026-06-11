import { OrganizationalMemoryView } from "@/components/sai/organizational-memory-view";
import { getAgents } from "@/lib/sai/agents";
import {
  getExecutiveTimeline,
  getOrganizationalMemory,
  getOrgMemoryStats,
  ORG_MEMORY_NAV,
} from "@/lib/sai/organizational-memory";
import type { OrgMemoryNavSection } from "@/lib/sai/organizational-memory.types";
import { getCurrentUser } from "@/lib/sai/current-user.server";
import { isFounder } from "@/lib/sai/current-user.types";
import { getProjects } from "@/lib/sai/projects";
import { isSupabaseConfigured } from "@/lib/supabase/server";

const emptyCounts = Object.fromEntries(ORG_MEMORY_NAV.map((n) => [n.id, 0])) as Record<
  OrgMemoryNavSection,
  number
>;

export default async function OrganizationalMemoryPage() {
  const currentUser = await getCurrentUser();
  const userIsFounder = currentUser ? isFounder(currentUser.profile) : false;
  const configured = isSupabaseConfigured();

  const [memories, sectionCounts, timeline, projects, agents] = configured
    ? await Promise.all([
        getOrganizationalMemory({ navSection: "explorer", limit: 200 }),
        getOrgMemoryStats(),
        getExecutiveTimeline(50),
        getProjects(),
        getAgents(),
      ])
    : [[], emptyCounts, [], [], []];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/70">
          Institutional Memory System — Locked
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white md:text-3xl">Organizational Memory</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/55">
          The living memory of InnovateAegis — what happened, why, who was involved, what was
          decided, and what was learned. Generated automatically from execution. Distinct from
          Company Brain, which stores organizational truth.
        </p>
      </header>

      <OrganizationalMemoryView
        initialMemories={memories}
        sectionCounts={sectionCounts}
        initialTimeline={timeline}
        projects={projects}
        agents={agents}
        isFounder={userIsFounder}
        supabaseConfigured={configured}
      />
    </div>
  );
}
