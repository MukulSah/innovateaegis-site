import type { SessionChatMessage } from "@/lib/sai/session-chat";

type Props = {
  messages: SessionChatMessage[];
  title?: string;
};

export function SessionChat({ messages, title = "Session Chat" }: Props) {
  if (messages.length === 0) {
    return (
      <section className="enterprise-glass rounded-xl border border-white/10 p-5">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <p className="mt-2 text-sm text-white/40">No messages yet. Launch an objective to start the narrative.</p>
      </section>
    );
  }

  return (
    <section className="enterprise-glass rounded-xl border border-white/10 p-5">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <p className="mt-1 text-xs text-white/45">Permanent project narrative — founder and agent dialogue</p>
      <ul className="mt-4 max-h-[28rem] space-y-3 overflow-y-auto pr-1">
        {messages.map((msg) => (
          <li
            key={msg.id}
            className={`rounded-lg border p-3 ${
              msg.speakerType === "founder"
                ? "border-purple-400/20 bg-purple-500/5"
                : msg.speakerType === "system"
                  ? "border-white/5 bg-white/[0.02]"
                  : "border-cyan-400/15 bg-cyan-500/5"
            }`}
          >
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-sm font-medium text-white">{msg.speakerName}</span>
              {msg.speakerRole && (
                <span className="text-[10px] uppercase tracking-wider text-white/35">{msg.speakerRole}</span>
              )}
              {msg.stepKey && (
                <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-white/40">{msg.stepKey}</span>
              )}
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-white/75">{msg.message}</p>
            <time className="mt-2 block text-[10px] text-white/30">
              {new Date(msg.createdAt).toLocaleString()}
            </time>
          </li>
        ))}
      </ul>
    </section>
  );
}
