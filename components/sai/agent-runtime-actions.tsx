"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Agent, AgentConversation, AgentRuntimeSession, Task } from "@/lib/sai/types";

type Props = {
  agentId: string;
  workflowId: string | null;
  stepKey: string;
  sessions: AgentRuntimeSession[];
  conversations: AgentConversation[];
  assignedTasks: Task[];
  agents: Agent[];
};

export function AgentRuntimeActions({
  agentId,
  workflowId,
  stepKey,
  sessions: initialSessions,
  conversations,
  assignedTasks,
  agents,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState(initialSessions);
  const [error, setError] = useState("");
  const [reassignTaskId, setReassignTaskId] = useState(assignedTasks[0]?.id ?? "");
  const [reassignTargetId, setReassignTargetId] = useState("");

  async function runAgent() {
    if (!workflowId) {
      setError("No active workflow assigned to this agent.");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch(`/api/sai/agents/${agentId}/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workflowId, stepKey }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error || "Execution failed");
    router.refresh();
    setLoading(false);
  }

  async function runtimeAction(
    sessionId: string,
    action: "pause" | "resume" | "terminate" | "retry",
  ) {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/sai/agents/${agentId}/runtime`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, action }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Action failed");
    } else if (data.session) {
      setSessions((prev) => prev.map((s) => (s.id === sessionId ? data.session : s)));
    }
    router.refresh();
    setLoading(false);
  }

  async function reassignWork() {
    if (!reassignTaskId || !reassignTargetId) {
      setError("Select a task and target agent.");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch(`/api/sai/agents/${agentId}/runtime`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "reassign",
        taskId: reassignTaskId,
        targetAgentId: reassignTargetId,
      }),
    });
    const data = await res.json();
    if (!res.ok) setError(data.error || "Reassign failed");
    router.refresh();
    setLoading(false);
  }

  return (
    <section className="enterprise-glass rounded-xl border border-purple-400/20 p-5">
      <h3 className="text-sm font-semibold text-white">Runtime Actions</h3>
      <p className="mt-1 text-xs text-white/45">
        Run, pause, resume, terminate, retry, or reassign agent AI execution.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading || !workflowId}
          onClick={runAgent}
          className="rounded-lg bg-gradient-to-r from-purple-600 to-cyan-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          {loading ? "Running…" : "Run Agent"}
        </button>
        {sessions.filter((s) => s.status === "RUNNING").map((s) => (
          <button
            key={s.id}
            type="button"
            disabled={loading}
            onClick={() => runtimeAction(s.id, "pause")}
            className="rounded-lg border border-amber-400/30 px-3 py-2 text-xs text-amber-300"
          >
            Pause
          </button>
        ))}
        {sessions.filter((s) => s.status === "PAUSED").map((s) => (
          <button
            key={s.id}
            type="button"
            disabled={loading}
            onClick={() => runtimeAction(s.id, "resume")}
            className="rounded-lg border border-emerald-400/30 px-3 py-2 text-xs text-emerald-300"
          >
            Resume
          </button>
        ))}
      </div>

      {assignedTasks.length > 0 && agents.length > 1 && (
        <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-white/5 pt-4">
          <label className="text-xs text-white/50">
            Reassign task
            <select
              value={reassignTaskId}
              onChange={(e) => setReassignTaskId(e.target.value)}
              className="mt-1 block rounded-lg border border-white/10 bg-[#0d0d14] px-2 py-1.5 text-xs text-white"
            >
              {assignedTasks.map((t) => (
                <option key={t.id} value={t.id}>{t.title}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-white/50">
            To agent
            <select
              value={reassignTargetId}
              onChange={(e) => setReassignTargetId(e.target.value)}
              className="mt-1 block rounded-lg border border-white/10 bg-[#0d0d14] px-2 py-1.5 text-xs text-white"
            >
              <option value="">Select agent</option>
              {agents.filter((a) => a.id !== agentId).map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={loading}
            onClick={reassignWork}
            className="rounded-lg border border-cyan-400/30 px-3 py-2 text-xs text-cyan-300"
          >
            Reassign Work
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-300">{error}</p>}

      {sessions.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-white/40">Sessions · Reasoning · Outputs</p>
          {sessions.slice(0, 5).map((s) => (
            <div key={s.id} className="rounded border border-white/5 p-2 text-xs">
              <div className="flex flex-wrap justify-between gap-2 text-white/70">
                <span>{s.status} · {s.modelProvider}/{s.modelName}</span>
                <div className="flex gap-2">
                  {s.status === "FAILED" && (
                    <button type="button" onClick={() => runtimeAction(s.id, "retry")} className="text-cyan-300">
                      Retry
                    </button>
                  )}
                  {["RUNNING", "PAUSED"].includes(s.status) && (
                    <button type="button" onClick={() => runtimeAction(s.id, "terminate")} className="text-red-300">
                      Terminate
                    </button>
                  )}
                </div>
              </div>
              {s.reasoning && <p className="mt-1 text-white/40">Reasoning: {s.reasoning}</p>}
              {s.output && <p className="mt-1 line-clamp-3 text-white/50">{s.output}</p>}
              {s.errorMessage && <p className="mt-1 text-red-300/80">{s.errorMessage}</p>}
            </div>
          ))}
        </div>
      )}

      {conversations.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-white/5 pt-4">
          <p className="text-[10px] uppercase tracking-wider text-white/40">Recent Conversations</p>
          {conversations.slice(0, 4).map((c) => (
            <div key={c.id} className="rounded border border-white/5 p-2 text-xs">
              <p className="text-[10px] text-purple-300/70">
                {c.senderAgentName ?? "System"} → {c.receiverAgentName ?? "Team"} · {c.messageType}
              </p>
              <p className="mt-1 text-white/60">{c.message.slice(0, 200)}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
