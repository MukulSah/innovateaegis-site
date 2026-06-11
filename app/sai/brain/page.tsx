import { CompanyBrainView } from "@/components/sai/company-brain-view";
import { getBrainLayers, getBrainSections, getBrainStats, getMemoryRecords } from "@/lib/sai/brain";
import { getAgents } from "@/lib/sai/agents";
import { getCurrentUser } from "@/lib/sai/current-user.server";
import { isFounder } from "@/lib/sai/current-user.types";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export default async function CompanyBrainPage() {
  const currentUser = await getCurrentUser();
  const userIsFounder = currentUser ? isFounder(currentUser.profile) : false;
  const configured = isSupabaseConfigured();

  const emptyStats = {
    totalRecords: 0,
    activeRecords: 0,
    archivedRecords: 0,
    totalRelationships: 0,
    totalDomains: 0,
    totalCategories: 0,
    agentContainers: 0,
    founderMemories: 0,
    retrievalCount: 0,
  };

  const [layers, sections, records, stats, agents] = configured
    ? await Promise.all([
        getBrainLayers(),
        getBrainSections(),
        getMemoryRecords({ includeArchived: true, isFounder: userIsFounder }),
        getBrainStats(),
        getAgents(),
      ])
    : [[], [], [], emptyStats, []];

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-purple-300/70">
          Constitutional Knowledge System — Locked
        </p>
        <h1 className="mt-1 text-2xl font-bold text-white md:text-3xl">Company Brain</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/55">
          Official organizational truth of InnovateAegis. Not founder notes. Not agent memory.
          Not meeting history. Not organizational memory. Every record requires ownership and approval.
        </p>
      </header>

      <CompanyBrainView
        layers={layers}
        sections={sections}
        initialRecords={records}
        stats={stats}
        agents={agents}
        isFounder={userIsFounder}
        supabaseConfigured={configured}
      />
    </div>
  );
}
