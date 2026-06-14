"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { formatClientApiError, parseJsonResponse } from "@/lib/sai/client-api";
import { useSaiRealtimeSync } from "@/lib/sai/use-sai-realtime-sync";
import type { FounderChatActionType } from "@/lib/sai/types";

type Message = {
  role: "user" | "assistant";
  content: string;
  pendingActionId?: string | null;
};

const EXAMPLES = [
  "What is everyone working on?",
  "Why is Session waiting?",
  "Resume Session",
  "What failed?",
  "Force Complete Session",
];

type Props = {
  projectId?: string | null;
};

export function FounderOperationsChat({ projectId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const loadHistory = useCallback(async () => {
    try {
      const route = "/api/sai/founder/operations";
      const res = await fetch(route);
      const data = await parseJsonResponse<{
        messages?: { role: "user" | "assistant"; content: string; pendingActionId: string | null }[];
      }>(res, route);
      if (data.messages?.length) {
        setMessages(
          data.messages.map((m) => ({
            role: m.role,
            content: m.content,
            pendingActionId: m.pendingActionId,
          })),
        );
        const lastPending = [...data.messages].reverse().find((m) => m.pendingActionId);
        if (lastPending?.pendingActionId) setPendingActionId(lastPending.pendingActionId);
      }
    } catch {
      // best-effort
    } finally {
      setHistoryLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useSaiRealtimeSync(
    () => {
      loadHistory().catch(() => {});
    },
    ["founder_chat_actions", "founder_operations_messages", "workflow_runs", "ai_retry_queue"],
    { debounceMs: 1500, minIntervalMs: 3000 },
  );

  async function send(question: string, approveId?: string | null) {
    if (!question.trim() || loading) return;
    setMessages((m) => [...m, { role: "user", content: question.trim() }]);
    setInput("");
    setLoading(true);
    try {
      const route = "/api/sai/founder/operations";
      const res = await fetch(route, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          projectId,
          approveActionId: approveId ?? undefined,
        }),
      });
      const data = await parseJsonResponse<{
        answer?: string;
        error?: string;
        pendingAction?: { id: string; approveLabel: string; actionType: FounderChatActionType } | null;
      }>(res, route);
      if (!res.ok) throw new Error(data.error ?? "Query failed");

      const actionId = data.pendingAction?.id ?? null;
      setPendingActionId(actionId);

      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: data.answer ?? "No answer returned.",
          pendingActionId: actionId,
        },
      ]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: formatClientApiError(err, "Founder Operations") },
      ]);
    } finally {
      setLoading(false);
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (/^\s*approve\s*$/i.test(input) && pendingActionId) {
      send("Approve", pendingActionId);
      setPendingActionId(null);
      return;
    }
    send(input);
  }

  return (
    <section className="enterprise-glass rounded-xl border border-purple-400/20 p-5">
      <header>
        <p className="text-[10px] uppercase tracking-wider text-purple-300/70">Founder Operations Chat</p>
        <h2 className="mt-1 text-lg font-semibold text-white">Operational Command Center</h2>
        <p className="mt-1 text-xs text-white/45">
          Answers from live workflow state, queue status, and artifacts. Actions require approval. History is saved.
        </p>
      </header>

      <div className="mt-4 flex flex-wrap gap-2">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            onClick={() => send(ex)}
            disabled={loading}
            className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-white/60 hover:border-purple-400/30 hover:text-white disabled:opacity-50"
          >
            {ex}
          </button>
        ))}
      </div>

      <div className="mt-4 max-h-72 space-y-3 overflow-y-auto rounded-lg border border-white/10 bg-black/20 p-3">
        {!historyLoaded ? (
          <p className="text-xs text-white/40">Loading conversation…</p>
        ) : messages.length === 0 ? (
          <p className="text-xs text-white/40">
            Ask about sessions, blockers, or queue status. Use commands like &quot;Resume Session&quot; or &quot;Force Complete Session&quot;.
          </p>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                m.role === "user"
                  ? "ml-8 bg-purple-500/15 text-purple-100"
                  : "mr-8 bg-white/5 text-white/75"
              }`}
            >
              {m.content}
              {m.pendingActionId && (
                <button
                  type="button"
                  onClick={() => {
                    send("Approve", m.pendingActionId);
                    setPendingActionId(null);
                  }}
                  className="mt-2 block rounded bg-emerald-600/80 px-3 py-1 text-xs font-semibold text-white"
                >
                  Approve
                </button>
              )}
            </div>
          ))
        )}
        {loading && <p className="text-xs text-white/40">Reading live system state…</p>}
        <div ref={endRef} />
      </div>

      <form onSubmit={onSubmit} className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask or command — type Approve when prompted…"
          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-lg bg-purple-600/80 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </section>
  );
}
