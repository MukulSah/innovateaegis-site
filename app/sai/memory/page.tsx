import { KnowledgeSearch } from "@/components/sai/knowledge-search";
import { SectionPage } from "@/components/sai/section-page";
import { getDecisions, getMeetings, getMemoryRecords } from "@/lib/sai/queries";

const memoryTypes = [
  { type: "product", label: "Product Memory", desc: "Why features exist" },
  { type: "engineering", label: "Engineering Memory", desc: "How systems were built" },
  { type: "customer", label: "Customer Memory", desc: "Who requested changes" },
  { type: "decision", label: "Decision Memory", desc: "Why decisions were made" },
  { type: "business", label: "Business Memory", desc: "Impact on revenue and growth" },
] as const;

const typeColors: Record<string, string> = {
  product: "text-violet-300 border-violet-400/20 bg-violet-500/10",
  engineering: "text-cyan-300 border-cyan-400/20 bg-cyan-500/10",
  customer: "text-pink-300 border-pink-400/20 bg-pink-500/10",
  decision: "text-amber-300 border-amber-400/20 bg-amber-500/10",
  business: "text-emerald-300 border-emerald-400/20 bg-emerald-500/10",
};

export default async function MemoryPage() {
  const [records, decisions, meetings] = await Promise.all([
    getMemoryRecords(30),
    getDecisions(),
    getMeetings(),
  ]);

  return (
    <SectionPage
      title="Company Memory"
      subtitle="The company never forgets"
      description="All product, engineering, customer, decision, and business knowledge is stored, indexed, and searchable. Memories evolve as the company grows."
    >
      <KnowledgeSearch />

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {memoryTypes.map((mt) => (
          <div key={mt.type} className={`rounded-xl border p-4 ${typeColors[mt.type]}`}>
            <p className="text-sm font-semibold">{mt.label}</p>
            <p className="mt-1 text-xs opacity-70">{mt.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 space-y-3">
        <h2 className="text-sm font-semibold text-white">Recent Memory Records</h2>
        {records.map((record) => (
          <article
            key={record.id}
            className="enterprise-glass rounded-xl border border-white/10 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${typeColors[record.type]}`}>
                {record.type}
              </span>
              <span className="text-[10px] text-white/35">{record.date}</span>
            </div>
            <h3 className="mt-2 text-sm font-medium text-white">{record.title}</h3>
            <p className="mt-1 text-xs leading-relaxed text-white/55">{record.summary}</p>
          </article>
        ))}
      </div>

      <div className="mt-8 space-y-3">
        <h2 className="text-sm font-semibold text-white">Decision Engine</h2>
        {decisions.map((d) => (
          <article key={d.id} className="enterprise-glass rounded-xl border border-amber-400/10 p-4">
            <h3 className="text-sm font-medium text-white">{d.title}</h3>
            <p className="mt-1 text-xs text-white/55">{d.reason}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-white/35">
              {d.owner && <span>Owner: {d.owner.name}</span>}
              {d.projects.map((p) => (
                <span key={p.name} className="rounded border border-white/10 px-1.5 py-0.5">{p.name}</span>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="mt-8 space-y-3">
        <h2 className="text-sm font-semibold text-white">Meetings</h2>
        {meetings.map((m) => (
          <article key={m.id} className="enterprise-glass rounded-xl border border-white/10 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-white">{m.title}</h3>
              <span className="rounded-full border border-purple-400/20 bg-purple-500/10 px-2 py-0.5 text-[10px] uppercase text-purple-200">
                {m.type.replace(/_/g, " ")}
              </span>
            </div>
            {m.notes && <p className="mt-2 text-xs text-white/55">{m.notes}</p>}
            <div className="mt-2 text-[10px] text-white/35">
              {m.organizer && <span>Organizer: {m.organizer.name}</span>}
              {m.scheduledAt && (
                <span> · {m.scheduledAt.toISOString().slice(0, 10)}</span>
              )}
            </div>
          </article>
        ))}
      </div>
    </SectionPage>
  );
}
