type Message = {
  id: string;
  type: string;
  subject: string;
  content: string;
  createdAt: Date;
  fromAgent: { slug: string; name: string; role: string };
  toAgent: { slug: string; name: string; role: string } | null;
};

type Props = {
  discussions: Message[];
  recommendations: Message[];
  decisions: Message[];
  escalations: Message[];
};

const typeLabels: Record<string, string> = {
  discussion: "Agent Discussions",
  recommendation: "Agent Recommendations",
  decision: "Agent Decisions",
  escalation: "Agent Escalations",
};

export function AgentNetworkPanel({ discussions, recommendations, decisions, escalations }: Props) {
  const sections = [
    { key: "escalation", items: escalations },
    { key: "decision", items: decisions },
    { key: "recommendation", items: recommendations },
    { key: "discussion", items: discussions },
  ];

  return (
    <section className="space-y-6">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-purple-300/70">
          Agent Communication Network
        </p>
        <h2 className="mt-1 text-lg font-bold text-white">The company is alive</h2>
        <p className="mt-1 text-xs text-white/45">
          Agents communicate, recommend, decide, and escalate — all visible to leadership.
        </p>
      </div>

      {sections.map(({ key, items }) => (
        items.length > 0 && (
          <div key={key} className="enterprise-glass rounded-xl border border-white/10 p-5">
            <h3 className="text-sm font-semibold text-white">{typeLabels[key]}</h3>
            <div className="mt-3 space-y-3">
              {items.map((msg) => (
                <article key={msg.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-white/40">
                    <span className="font-semibold text-purple-300/80">{msg.fromAgent.name}</span>
                    {msg.toAgent && (
                      <>
                        <span>→</span>
                        <span className="text-cyan-300/80">{msg.toAgent.name}</span>
                      </>
                    )}
                    <span>·</span>
                    <span>{new Date(msg.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-white/85">{msg.subject}</p>
                  <p className="mt-1 text-xs leading-relaxed text-white/55">{msg.content}</p>
                </article>
              ))}
            </div>
          </div>
        )
      ))}
    </section>
  );
}
