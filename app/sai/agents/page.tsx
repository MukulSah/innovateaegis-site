import { AgentAssistPanel } from "@/components/sai/agent-assist-panel";
import { SectionPage } from "@/components/sai/section-page";
import { getAgentDrafts } from "@/lib/sai/agent-drafts";

export default async function AgentsPage() {
  const drafts = await getAgentDrafts();

  return (
    <SectionPage
      title="AI Agents"
      subtitle="Human-assisted drafts"
      description="Agents help humans by generating architecture drafts, test plans, task breakdowns, and release notes. All outputs require review."
    >
      <AgentAssistPanel />

      {drafts.length > 0 && (
        <div className="mt-8 space-y-3">
          <h2 className="text-sm font-semibold text-white">Recent Drafts</h2>
          {drafts.map((draft) => (
            <article key={draft.id} className="enterprise-glass rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-white">{draft.title}</h3>
                <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-200">
                  {draft.status.replace(/_/g, " ")}
                </span>
              </div>
              <p className="mt-2 line-clamp-3 font-mono text-xs text-white/55">{draft.content}</p>
              <p className="mt-2 text-[10px] text-white/30">
                {draft.agentType} · {draft.createdAt.toISOString().slice(0, 10)}
              </p>
            </article>
          ))}
        </div>
      )}
    </SectionPage>
  );
}
