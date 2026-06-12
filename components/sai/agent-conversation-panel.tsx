"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SessionChatMessage } from "@/lib/sai/session-chat";

type Props = {
  messages: SessionChatMessage[];
  agentId: string;
  agentName: string;
  objectiveId?: string;
  workflowRunId?: string;
  artifactId?: string;
  conversationOpen: boolean;
  title?: string;
};

export function AgentConversationPanel({
  messages,
  agentId,
  agentName,
  objectiveId,
  workflowRunId,
  artifactId,
  conversationOpen,
  title = "Conversation",
}: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [localMessages, setLocalMessages] = useState<SessionChatMessage[]>([]);

  const seen = new Set<string>();
  const chatMessages = [...messages, ...localMessages]
    .filter((m) => m.messageKind === "chat" || m.messageKind === "artifact")
    .filter((m) => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });

  async function send() {
    const text = draft.trim();
    if (!text || loading || !conversationOpen) return;

    setLoading(true);
    setError("");
    setDraft("");

    try {
      const res = await fetch("/api/sai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          message: text,
          objectiveId,
          workflowRunId,
          artifactId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send message");

      if (Array.isArray(data.messages)) {
        setLocalMessages((prev) => [...prev, ...data.messages]);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send");
      setDraft(text);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="enterprise-glass rounded-xl border border-white/10 p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <span className="text-[10px] uppercase tracking-wider text-cyan-300/70">{agentName}</span>
      </div>
      <p className="mt-1 text-xs text-white/45">
        {conversationOpen
          ? "Ask questions about the strategic brief before approving"
          : "Strategy approved — session active"}
      </p>

      <ul className="mt-4 max-h-[24rem] space-y-3 overflow-y-auto pr-1">
        {chatMessages.length === 0 ? (
          <li className="text-sm text-white/40">No messages yet. Ask the agent a question to start.</li>
        ) : (
          chatMessages.map((msg) => (
            <li
              key={msg.id}
              className={`rounded-lg border p-3 ${
                msg.speakerType === "founder"
                  ? "border-purple-400/20 bg-purple-500/5"
                  : msg.messageKind === "artifact"
                    ? "border-amber-400/20 bg-amber-500/5"
                    : "border-cyan-400/15 bg-cyan-500/5"
              }`}
            >
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-sm font-medium text-white">{msg.speakerName}</span>
                {msg.messageKind === "artifact" && (
                  <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-200/80">
                    artifact
                  </span>
                )}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-white/75">{msg.message}</p>
              <time className="mt-2 block text-[10px] text-white/30">
                {new Date(msg.createdAt).toLocaleString()}
              </time>
            </li>
          ))
        )}
      </ul>

      {conversationOpen ? (
        <div className="mt-4 border-t border-white/10 pt-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              placeholder={`Message ${agentName}…`}
              disabled={loading}
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={loading || !draft.trim()}
              className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-medium text-white hover:bg-purple-500 disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send"}
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
        </div>
      ) : (
        <p className="mt-4 border-t border-white/10 pt-4 text-xs text-white/40">
          Conversation closed. Approval actions are no longer available for this artifact.
        </p>
      )}
    </section>
  );
}
