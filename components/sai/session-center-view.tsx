"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SessionRegistryTable } from "@/components/sai/session-registry-table";
import { decideApprovalAction } from "@/lib/sai/approval-actions";
import { formatClientApiError, parseJsonResponse } from "@/lib/sai/client-api";
import type {
  FounderAwaitingApproval,
  FounderSessionRow,
  FounderSessionTimelineData,
} from "@/lib/sai/founder-timeline";
import {
  SESSION_CENTER_SECTION_TITLES,
  buildSessionCenterDashboard,
  getAllSessionRows,
  getRegistryRows,
} from "@/lib/sai/session-center";
import type { SessionDuty } from "@/lib/sai/session-duties";
import type { AutomationRule } from "@/lib/sai/session-automation";
import type { SessionTemplate } from "@/lib/sai/session-templates";
import type { AgentArchetype } from "@/lib/sai/agent-archetypes";
import type { ToolDefinition } from "@/lib/sai/tool-permissions";
import { useDebouncedRouterRefresh } from "@/lib/sai/use-debounced-router-refresh";
import { useSaiRealtimeSync } from "@/lib/sai/use-sai-realtime-sync";
import type { Agent, Project, SessionCenterSection } from "@/lib/sai/types";

type Props = {
  initialTimeline: FounderSessionTimelineData;
  section: SessionCenterSection | null;
  projects: Project[];
  agents: Agent[];
  duties: SessionDuty[];
  automations: AutomationRule[];
  templates: SessionTemplate[];
  archetypes: AgentArchetype[];
  customAgents: { id: string; name: string; role: string; archetypeSlug: string | null }[];
  tools: ToolDefinition[];
  isAdmin: boolean;
};

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function MetricCard({
  label,
  value,
  accent,
  href,
}: {
  label: string;
  value: string | number;
  accent?: string;
  href?: string;
}) {
  const inner = (
    <div className={`enterprise-glass rounded-xl border p-4 ${accent ?? "border-white/10"}`}>
      <p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p>
      <p className="mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
  return href ? (
    <Link href={href} className="block transition-transform hover:scale-[1.02]">
      {inner}
    </Link>
  ) : (
    inner
  );
}

function HealthGauge({ score, label }: { score: number; label: string }) {
  const color =
    score >= 80 ? "from-emerald-500 to-cyan-400" : score >= 50 ? "from-amber-500 to-orange-400" : "from-red-500 to-rose-400";

  return (
    <div className="enterprise-glass rounded-xl border border-cyan-400/20 p-5">
      <p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p>
      <div className="mt-3 flex items-end gap-3">
        <span className="text-4xl font-bold text-white">{score}%</span>
        <div className="mb-1 flex-1">
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className={`h-full rounded-full bg-gradient-to-r ${color}`} style={{ width: `${score}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ActiveSessionCard({ session }: { session: FounderSessionRow }) {
  return (
    <Link
      href={`/sai/sessions/${session.id}`}
      className="block rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-4 transition-colors hover:bg-emerald-500/10"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-emerald-300/70">
            Session #{session.sessionNumber ?? "—"} · {session.projectName}
          </p>
          <p className="mt-1 truncate text-sm font-medium text-white">{session.objective}</p>
        </div>
        <span className="shrink-0 text-xs text-emerald-300">{session.executionHealth}%</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-white/40">
        <span>{session.currentAgentName ?? "Unassigned"}</span>
        <span>·</span>
        <span>{session.currentDeliverable ?? session.sessionStatus.replace(/_/g, " ")}</span>
        <span>·</span>
        <span>{formatWhen(session.lastActivityAt)}</span>
      </div>
    </Link>
  );
}

function ApprovalQueue({
  items,
  onDecision,
  loadingId,
}: {
  items: FounderAwaitingApproval[];
  onDecision: (id: string, decision: string) => void;
  loadingId: string | null;
}) {
  if (!items.length) {
    return (
      <div className="rounded-xl border border-amber-400/15 bg-amber-500/5 p-4">
        <p className="text-sm text-white/50">No workflow approval items in the founder queue.</p>
        <p className="mt-1 text-xs text-white/40">
          Sessions in Waiting Approval below may need review in their workspace — use View or the Approvals tab.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((a) => (
        <div key={a.id} className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-amber-200/70">
                {a.approvalType.replace(/_/g, " ")} · {a.impact} impact
              </p>
              <p className="mt-1 font-medium text-white">{a.title}</p>
              <p className="mt-1 text-xs text-white/50">
                {a.projectName}
                {a.sessionNumber != null ? ` · Session #${a.sessionNumber}` : ""}
              </p>
            </div>
            {a.workflowId && (
              <Link href={`/sai/sessions/${a.workflowId}`} className="text-xs text-purple-300 hover:underline">
                Open Session →
              </Link>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={loadingId === a.id}
              onClick={() => onDecision(a.id, "approved")}
              className="glow-btn rounded-lg bg-emerald-600 px-4 py-1.5 text-[10px] font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={loadingId === a.id}
              onClick={() => onDecision(a.id, "rejected")}
              className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-1.5 text-[10px] text-red-200 hover:bg-red-500/20 disabled:opacity-50"
            >
              Reject
            </button>
            <button
              type="button"
              disabled={loadingId === a.id}
              onClick={() => onDecision(a.id, "revision_required")}
              className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] text-white/80 hover:bg-white/10 disabled:opacity-50"
            >
              Revision required
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SessionCreatePanel({
  projects,
  templates,
}: {
  projects: Project[];
  templates: SessionTemplate[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"instant" | "scheduled" | "recurring" | "triggered">("instant");
  const [objective, setObjective] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [templateSlug, setTemplateSlug] = useState(templates[0]?.slug ?? "");
  const [scheduledAt, setScheduledAt] = useState("");
  const [recurrenceRule, setRecurrenceRule] = useState("weekly");
  const [triggerEvent, setTriggerEvent] = useState("critical_incident");
  const [aiModelSelection, setAiModelSelection] = useState("auto");
  const [aiOptions, setAiOptions] = useState<
    { value: string; label: string; description: string }[]
  >([{ value: "auto", label: "Auto — rotate from saved pool", description: "" }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/sai/ai-providers/launch-options")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.options) setAiOptions(data.options);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!objective.trim() || !projectId) return;

    setLoading(true);
    setError("");
    try {
      const route = "/api/sai/sessions/spawn";
      const aiField = { aiModelSelection };
      const body =
        mode === "instant"
          ? { objective: objective.trim(), projectId, creationMode: "instant", ...aiField }
          : {
              objective: objective.trim(),
              projectId,
              creationMode: mode,
              templateSlug: templateSlug || undefined,
              scheduledAt: mode === "scheduled" ? new Date(scheduledAt).toISOString() : undefined,
              recurrenceRule: mode === "recurring" ? recurrenceRule : undefined,
              triggerMetadata:
                mode === "triggered" ? { eventType: triggerEvent, armed: true } : undefined,
              ...aiField,
            };

      const res = await fetch(route, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await parseJsonResponse<{ error?: string; sessionId?: string }>(res, route);
      if (!res.ok) throw new Error(data.error ?? "Failed to create session");
      setObjective("");
      if (data.sessionId) router.push(`/sai/sessions/${data.sessionId}`);
      else router.refresh();
    } catch (err) {
      setError(formatClientApiError(err, "Session creation"));
    } finally {
      setLoading(false);
    }
  }

  const modes = [
    { id: "instant" as const, label: "Instant", desc: "Execution starts immediately" },
    { id: "scheduled" as const, label: "Scheduled", desc: "Runs at a future date/time" },
    { id: "recurring" as const, label: "Recurring", desc: "Automatically generated on cadence" },
    { id: "triggered" as const, label: "Triggered", desc: "Created when conditions occur" },
  ];

  return (
    <section className="enterprise-glass rounded-xl border border-purple-400/20 p-5">
      <h2 className="text-sm font-semibold text-white">Create Session</h2>
      <p className="mt-1 text-xs text-white/45">Every meaningful company activity occurs through a session.</p>

      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setMode(m.id)}
            className={`rounded-lg border p-3 text-left transition-colors ${
              mode === m.id
                ? "border-purple-400/40 bg-purple-500/15 text-white"
                : "border-white/10 bg-white/[0.02] text-white/60 hover:bg-white/5"
            }`}
          >
            <p className="text-xs font-semibold">{m.label}</p>
            <p className="mt-1 text-[10px] text-white/40">{m.desc}</p>
          </button>
        ))}
      </div>

      {mode === "instant" ? (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <input
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Session objective — e.g. Fix Resume Download Issue"
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
          />
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={aiModelSelection}
            onChange={(e) => setAiModelSelection(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
          >
            {aiOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {error && <p className="text-xs text-red-300">{error}</p>}
          <button
            type="submit"
            disabled={loading || !objective.trim()}
            className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-medium text-white hover:bg-purple-500 disabled:opacity-50"
          >
            {loading ? "Creating…" : "Start Instant Session"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <input
            value={objective}
            onChange={(e) => setObjective(e.target.value)}
            placeholder="Session objective"
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
          />
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {templates.length > 0 && (
            <select
              value={templateSlug}
              onChange={(e) => setTemplateSlug(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
            >
              {templates.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.label}
                </option>
              ))}
            </select>
          )}
          {mode === "scheduled" && (
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
            />
          )}
          {mode === "recurring" && (
            <select
              value={recurrenceRule}
              onChange={(e) => setRecurrenceRule(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          )}
          {mode === "triggered" && (
            <select
              value={triggerEvent}
              onChange={(e) => setTriggerEvent(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
            >
              <option value="critical_incident">Critical Incident</option>
              <option value="project_delayed">Project Delayed</option>
            </select>
          )}
          {error && <p className="text-xs text-red-300">{error}</p>}
          <button
            type="submit"
            disabled={
              loading ||
              !objective.trim() ||
              (mode === "scheduled" && !scheduledAt)
            }
            className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-medium text-white hover:bg-purple-500 disabled:opacity-50"
          >
            {loading ? "Creating…" : `Create ${mode.charAt(0).toUpperCase() + mode.slice(1)} Session`}
          </button>
        </form>
      )}
    </section>
  );
}

function DashboardSection({
  timeline,
  metrics,
  onApprovalDecision,
  loadingId,
}: {
  timeline: FounderSessionTimelineData;
  metrics: ReturnType<typeof buildSessionCenterDashboard>;
  onApprovalDecision: (id: string, decision: string) => void;
  loadingId: string | null;
}) {
  const blockedAndOverdue = [
    ...timeline.blockedSessions,
    ...timeline.needsFounderReview,
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard
          label="Active Sessions"
          value={metrics.activeSessions}
          accent="border-emerald-400/25"
          href="/sai/sessions?section=registry-active"
        />
        <MetricCard
          label="Awaiting Approval"
          value={metrics.awaitingApproval}
          accent="border-amber-400/25"
          href="/sai/sessions?section=registry-approval"
        />
        <MetricCard
          label="Blocked"
          value={metrics.blockedSessions}
          accent="border-red-400/25"
          href="/sai/sessions?section=registry-active"
        />
        <MetricCard
          label="Overdue"
          value={metrics.overdueSessions}
          accent="border-orange-400/25"
        />
        <MetricCard
          label="Completed This Week"
          value={metrics.completedThisWeek}
          accent="border-cyan-400/25"
          href="/sai/sessions?section=registry-completed"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <HealthGauge score={metrics.executionHealth} label="Company Execution Health" />
        <div className="enterprise-glass rounded-xl border border-purple-400/20 p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-wider text-white/40">Automation Status</p>
            <Link href="/sai/automations" className="text-[10px] text-purple-300 hover:underline">
              Manage →
            </Link>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xl font-bold text-white">{metrics.automationActive}</p>
              <p className="text-[10px] text-white/40">Active rules</p>
            </div>
            <div>
              <p className="text-xl font-bold text-white">{metrics.scheduledSessions}</p>
              <p className="text-[10px] text-white/40">Scheduled sessions</p>
            </div>
            <div>
              <p className="text-xl font-bold text-white">{metrics.completionRate}%</p>
              <p className="text-[10px] text-white/40">Completion rate</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="enterprise-glass rounded-xl border border-emerald-400/20 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Active Execution</h2>
            <Link href="/sai/sessions?section=registry-active" className="text-[10px] text-emerald-300 hover:underline">
              View all →
            </Link>
          </div>
          <div className="mt-4 max-h-[360px] space-y-2 overflow-y-auto">
            {timeline.activeSessions.length === 0 ? (
              <p className="text-sm text-white/40">No active sessions. Create an objective to begin execution.</p>
            ) : (
              timeline.activeSessions.slice(0, 8).map((s) => <ActiveSessionCard key={s.id} session={s} />)
            )}
          </div>
        </section>

        <section className="enterprise-glass rounded-xl border border-amber-400/20 p-5">
          <h2 className="text-sm font-semibold text-white">Sessions Requiring Approval</h2>
          <div className="mt-4 max-h-[360px] overflow-y-auto">
            <ApprovalQueue
              items={timeline.awaitingFounderApproval}
              onDecision={onApprovalDecision}
              loadingId={loadingId}
            />
          </div>
        </section>
      </div>

      {(blockedAndOverdue.length > 0 || metrics.agentActivityToday > 0) && (
        <div className="grid gap-6 lg:grid-cols-2">
          {blockedAndOverdue.length > 0 && (
            <section className="enterprise-glass rounded-xl border border-red-400/20 p-5">
              <h2 className="text-sm font-semibold text-white">Blocked & At Risk</h2>
              <div className="mt-4 space-y-2">
                {blockedAndOverdue.slice(0, 5).map((s) => (
                  <ActiveSessionCard key={s.id} session={s} />
                ))}
              </div>
            </section>
          )}

          <section className="enterprise-glass rounded-xl border border-cyan-400/20 p-5">
            <h2 className="text-sm font-semibold text-white">Today&apos;s Agent Activity</h2>
            <p className="mt-2 text-3xl font-bold text-white">{metrics.agentActivityToday}</p>
            <p className="text-xs text-white/45">Agents actively executing sessions</p>
            <div className="mt-4 space-y-1">
              {[...new Set(timeline.activeSessions.map((s) => s.currentAgentName).filter(Boolean))].map((name) => (
                <p key={name} className="text-xs text-white/55">
                  {name}
                </p>
              ))}
            </div>
          </section>
        </div>
      )}

      <section className="enterprise-glass rounded-xl border border-purple-400/20 p-5">
        <h2 className="text-sm font-semibold text-white">Recent Knowledge Captured</h2>
        <p className="mt-1 text-xs text-white/45">
          {metrics.knowledgeCaptured} completed sessions with artifacts and organizational memory
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {timeline.completedSessions.slice(0, 6).map((s) => (
            <Link
              key={s.id}
              href={`/sai/sessions/${s.id}?tab=knowledge`}
              className="rounded-lg border border-white/10 bg-white/[0.02] p-3 hover:bg-white/[0.04]"
            >
              <p className="text-[10px] text-purple-300/70">Session #{s.sessionNumber}</p>
              <p className="mt-1 truncate text-xs text-white">{s.objective}</p>
              <p className="mt-1 text-[10px] text-white/35">{s.artifactCount} artifacts</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function TemplatesSection({ templates }: { templates: SessionTemplate[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((t) => (
        <article key={t.id} className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h3 className="text-sm font-semibold text-white">{t.label}</h3>
          <p className="mt-2 text-xs leading-relaxed text-white/50">{t.description}</p>
          <p className="mt-3 text-[10px] uppercase text-white/35">
            Type: {t.sessionType.replace(/_/g, " ")} · Priority: {t.defaultPriority}
          </p>
          <p className="mt-1 font-mono text-[10px] text-purple-300/60">{t.slug}</p>
        </article>
      ))}
    </div>
  );
}

function SchedulerDutiesSection({
  duties,
  automations,
  isAdmin,
}: {
  duties: SessionDuty[];
  automations: AutomationRule[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState("");

  const byRole = useMemo(() => {
    const map = new Map<string, SessionDuty[]>();
    for (const duty of duties) {
      if (!map.has(duty.agentRole)) map.set(duty.agentRole, []);
      map.get(duty.agentRole)!.push(duty);
    }
    return [...map.entries()];
  }, [duties]);

  const scheduled = automations.filter((a) => a.ruleType === "schedule");
  const events = automations.filter((a) => a.ruleType === "event");

  async function runDutyNow(dutyId: string) {
    await fetch("/api/sai/duties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "run", dutyId, force: true }),
    });
    router.refresh();
  }

  async function triggerRule(ruleId: string) {
    await fetch("/api/sai/automation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "trigger", ruleId }),
    });
    router.refresh();
  }

  async function runScheduler() {
    await fetch("/api/sai/scheduler/run", { method: "POST" });
    router.refresh();
  }

  async function createSchedulerFromAi() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiMessage("");
    try {
      const res = await fetch("/api/sai/duties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_from_ai", prompt: aiPrompt.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create scheduler");
      setAiMessage(`Created duty: ${data.duty?.title ?? "saved"}`);
      setAiPrompt("");
      router.refresh();
    } catch (err) {
      setAiMessage(err instanceof Error ? err.message : "Failed");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-white/50">
        Scheduler & Duties — agent-assigned recurring responsibilities with pre-planned objectives.
        Each duty spawns a session on schedule; trigger rules fire on COS events.
      </p>

      {isAdmin && (
        <section className="enterprise-glass rounded-xl border border-purple-400/20 p-5">
          <h3 className="text-sm font-semibold text-white">Ask AI — Create Scheduler</h3>
          <p className="mt-1 text-xs text-white/45">
            Describe what to schedule (agent, cadence, objective). COS saves it as a duty in the database.
          </p>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="e.g. Every Monday 9am COO runs weekly execution review session"
            rows={3}
            className="mt-3 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={aiLoading || !aiPrompt.trim()}
              onClick={createSchedulerFromAi}
              className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
            >
              {aiLoading ? "Creating…" : "Ask AI & Save Duty"}
            </button>
            <button
              type="button"
              onClick={runScheduler}
              className="rounded-lg border border-white/15 px-4 py-2 text-xs text-white/70 hover:bg-white/5"
            >
              Run Scheduler Now
            </button>
          </div>
          {aiMessage && <p className="mt-2 text-xs text-emerald-300">{aiMessage}</p>}
        </section>
      )}

      {byRole.map(([role, roleDuties]) => (
        <section key={role} className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h3 className="text-sm font-semibold text-white">{role} Duties</h3>
          <ul className="mt-4 space-y-3">
            {roleDuties.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <div>
                  <p className="text-sm text-white">{d.title}</p>
                  <p className="text-[10px] text-white/40">{d.cadence}</p>
                  {d.nextRunAt && (
                    <p className="text-[10px] text-cyan-300/60">Next: {formatWhen(d.nextRunAt)}</p>
                  )}
                  {d.lastSessionId && (
                    <Link href={`/sai/sessions/${d.lastSessionId}`} className="text-[10px] text-purple-300 hover:underline">
                      Last session →
                    </Link>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] uppercase ${
                      d.status === "active"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : d.status === "paused"
                          ? "bg-amber-500/15 text-amber-300"
                          : "bg-white/10 text-white/40"
                    }`}
                  >
                    {d.status}
                  </span>
                  {isAdmin && d.status === "active" && (
                    <button
                      type="button"
                      onClick={() => runDutyNow(d.id)}
                      className="rounded border border-white/15 px-2 py-0.5 text-[10px] text-white/70 hover:bg-white/5"
                    >
                      Run now
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {[
        { title: "Scheduled Session Rules", items: scheduled },
        { title: "Event Trigger Rules", items: events },
      ].map((group) =>
        group.items.length > 0 ? (
          <section key={group.title} className="enterprise-glass rounded-xl border border-white/10 p-5">
            <h3 className="text-sm font-semibold text-white">{group.title}</h3>
            <ul className="mt-4 space-y-3">
              {group.items.map((rule) => (
                <li key={rule.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-white">{rule.label}</p>
                      <p className="mt-1 text-xs text-white/45">{rule.description}</p>
                      <p className="mt-1 text-[10px] text-white/35">
                        Template: {rule.templateSlug}
                        {rule.lastTriggeredAt ? ` · Last: ${formatWhen(rule.lastTriggeredAt)}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] uppercase ${
                          rule.status === "active"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : rule.status === "paused"
                              ? "bg-amber-500/15 text-amber-300"
                              : "bg-white/10 text-white/40"
                        }`}
                      >
                        {rule.status}
                      </span>
                      {isAdmin && rule.status === "active" && (
                        <button
                          type="button"
                          onClick={() => triggerRule(rule.id)}
                          className="rounded border border-white/15 px-2 py-0.5 text-[10px] text-white/70 hover:bg-white/5"
                        >
                          Trigger
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null,
      )}
    </div>
  );
}

function DutiesSection({ duties, isAdmin }: { duties: SessionDuty[]; isAdmin: boolean }) {
  const router = useRouter();
  const byRole = useMemo(() => {
    const map = new Map<string, SessionDuty[]>();
    for (const duty of duties) {
      if (!map.has(duty.agentRole)) map.set(duty.agentRole, []);
      map.get(duty.agentRole)!.push(duty);
    }
    return [...map.entries()];
  }, [duties]);

  async function runDutyNow(dutyId: string) {
    await fetch("/api/sai/duties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "run", dutyId, force: true }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-white/50">
        Recurring agent responsibilities that automatically create sessions on schedule.
      </p>
      {byRole.map(([role, duties]) => (
        <section key={role} className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h3 className="text-sm font-semibold text-white">{role} Duties</h3>
          <ul className="mt-4 space-y-3">
            {duties.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <div>
                  <p className="text-sm text-white">{d.title}</p>
                  <p className="text-[10px] text-white/40">{d.cadence}</p>
                  {d.nextRunAt && (
                    <p className="text-[10px] text-cyan-300/60">Next: {formatWhen(d.nextRunAt)}</p>
                  )}
                  {d.lastSessionId && (
                    <Link href={`/sai/sessions/${d.lastSessionId}`} className="text-[10px] text-purple-300 hover:underline">
                      Last session →
                    </Link>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] uppercase ${
                      d.status === "active"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : d.status === "paused"
                          ? "bg-amber-500/15 text-amber-300"
                          : "bg-white/10 text-white/40"
                    }`}
                  >
                    {d.status}
                  </span>
                  {isAdmin && d.status === "active" && (
                    <button
                      type="button"
                      onClick={() => runDutyNow(d.id)}
                      className="rounded border border-white/15 px-2 py-0.5 text-[10px] text-white/70 hover:bg-white/5"
                    >
                      Run now
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function AutomationSection({ automations, isAdmin }: { automations: AutomationRule[]; isAdmin: boolean }) {
  const router = useRouter();
  const scheduled = automations.filter((a) => a.ruleType === "schedule");
  const events = automations.filter((a) => a.ruleType === "event");
  const agent = automations.filter((a) => a.ruleType === "agent");

  async function triggerRule(ruleId: string) {
    await fetch("/api/sai/automation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "trigger", ruleId }),
    });
    router.refresh();
  }

  async function runScheduler() {
    await fetch("/api/sai/scheduler/run", { method: "POST" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {isAdmin && (
        <button
          type="button"
          onClick={runScheduler}
          className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-medium text-white hover:bg-purple-500"
        >
          Run Scheduler Now
        </button>
      )}
      {[
        { title: "Scheduled Sessions", items: scheduled },
        { title: "Trigger Rules", items: events },
        { title: "Agent-Based Automation", items: agent },
      ].map((group) => (
        <section key={group.title} className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h3 className="text-sm font-semibold text-white">{group.title}</h3>
          <ul className="mt-4 space-y-3">
            {group.items.map((rule) => (
              <li key={rule.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-white">{rule.label}</p>
                    <p className="mt-1 text-xs text-white/45">{rule.description}</p>
                    <p className="mt-1 text-[10px] text-white/35">
                      Template: {rule.templateSlug}
                      {rule.lastTriggeredAt ? ` · Last: ${formatWhen(rule.lastTriggeredAt)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] uppercase ${
                        rule.status === "active"
                          ? "bg-emerald-500/15 text-emerald-300"
                          : rule.status === "paused"
                            ? "bg-amber-500/15 text-amber-300"
                            : "bg-white/10 text-white/40"
                      }`}
                    >
                      {rule.status}
                    </span>
                    {isAdmin && rule.status === "active" && (
                      <button
                        type="button"
                        onClick={() => triggerRule(rule.id)}
                        className="rounded border border-white/15 px-2 py-0.5 text-[10px] text-white/70 hover:bg-white/5"
                      >
                        Trigger
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function AgentsSection({
  agents,
  archetypes,
  customAgents,
  tools,
  isAdmin,
}: {
  agents: Agent[];
  archetypes: AgentArchetype[];
  customAgents: Props["customAgents"];
  tools: ToolDefinition[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const orgAgents = agents.filter((a) => a.status === "active" && !customAgents.some((c) => c.id === a.id));

  async function createFromArchetype(slug: string) {
    await fetch("/api/sai/agents/framework", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_from_archetype", archetypeSlug: slug }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="enterprise-glass rounded-xl border border-white/10 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Organization Agents</h3>
          <Link href="/sai/organization?section=agent-center" className="text-xs text-purple-300 hover:underline">
            Full roster →
          </Link>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {orgAgents.map((a) => (
            <Link
              key={a.id}
              href={`/sai/organization/agents/${a.id}/workspace`}
              className="rounded-lg border border-white/10 bg-white/[0.02] p-4 hover:bg-white/[0.04]"
            >
              <p className="text-sm font-medium text-white">{a.name}</p>
              <p className="text-[10px] text-purple-300/70">{a.role}</p>
              <p className="mt-2 text-[10px] text-white/40">{a.department ?? "Unassigned"}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="enterprise-glass rounded-xl border border-purple-400/20 p-5">
        <h3 className="text-sm font-semibold text-white">Custom Agents</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {archetypes.map((a) => (
            <div key={a.slug} className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
              <p className="text-sm font-medium text-white">{a.label}</p>
              <p className="mt-1 text-xs text-white/45">{a.description}</p>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => createFromArchetype(a.slug)}
                  className="mt-2 text-[10px] text-purple-300 hover:underline"
                >
                  Create agent →
                </button>
              )}
            </div>
          ))}
        </div>
        {customAgents.length > 0 && (
          <ul className="mt-4 space-y-2">
            {customAgents.map((a) => (
              <li key={a.id}>
                <Link href={`/sai/organization/agents/${a.id}/workspace`} className="text-xs text-white hover:text-purple-200">
                  {a.name} · {a.role}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="enterprise-glass rounded-xl border border-white/10 p-5">
        <h3 className="text-sm font-semibold text-white">Tool Permission Registry</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          {tools.map((t) => (
            <span
              key={t.toolKey}
              className={`rounded px-2 py-1 text-[10px] ${t.isDangerous ? "bg-red-500/15 text-red-300" : "bg-white/10 text-white/60"}`}
              title={t.description}
            >
              {t.label}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs text-white/40">Tool access enforced at agent execution runtime.</p>
      </section>
    </div>
  );
}

function IntelligenceSection() {
  const [summary, setSummary] = useState<{
    sessionFiles: number;
    decisions: number;
    knowledge: number;
    architecture: number;
    total: number;
  } | null>(null);
  const [records, setRecords] = useState<
    { id: string; recordType: string; title: string; summary: string; sourceSessionId: string | null }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [summaryRes, recordsRes] = await Promise.all([
          fetch("/api/sai/records?summary=1"),
          fetch("/api/sai/records"),
        ]);
        const summaryData = await parseJsonResponse<{ summary?: typeof summary }>(summaryRes, "/api/sai/records?summary=1");
        const recordsData = await parseJsonResponse<{ records?: typeof records }>(recordsRes, "/api/sai/records");
        if (summaryData.summary) setSummary(summaryData.summary);
        if (recordsData.records) setRecords(recordsData.records);
      } catch {
        // best-effort
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const decisions = records.filter((r) => r.recordType === "decision").slice(0, 10);
  const lessons = records.filter((r) => ["lesson", "knowledge", "recommendation"].includes(r.recordType)).slice(0, 8);
  const risks = records.filter((r) => r.recordType === "recommendation").slice(0, 5);

  return (
    <div className="space-y-6">
      {summary && (
        <div className="grid gap-3 sm:grid-cols-4">
          <MetricCard label="Session Files" value={summary.sessionFiles} href="/sai/records" />
          <MetricCard label="Decisions" value={summary.decisions} href="/sai/records" />
          <MetricCard label="Knowledge" value={summary.knowledge} href="/sai/records" />
          <MetricCard label="Architecture" value={summary.architecture} href="/sai/records" />
        </div>
      )}

    <div className="grid gap-6 lg:grid-cols-2">
      <section className="enterprise-glass rounded-xl border border-white/10 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Decisions</h3>
          <Link href="/sai/records" className="text-xs text-purple-300 hover:underline">
            Records Center →
          </Link>
        </div>
        <ul className="mt-4 space-y-2">
          {loading ? (
            <li className="text-sm text-white/40">Loading…</li>
          ) : decisions.length === 0 ? (
            <li className="text-sm text-white/40">No recorded decisions yet.</li>
          ) : (
            decisions.map((r) => (
              <li key={r.id} className="rounded-lg border border-white/5 p-3 text-xs">
                {r.sourceSessionId ? (
                  <Link href={`/sai/sessions/${r.sourceSessionId}`} className="text-white hover:text-purple-200">
                    {r.title}
                  </Link>
                ) : (
                  <p className="text-white">{r.title}</p>
                )}
                <p className="mt-1 text-white/45">{r.summary}</p>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="enterprise-glass rounded-xl border border-white/10 p-5">
        <h3 className="text-sm font-semibold text-white">Lessons Learned</h3>
        <ul className="mt-4 space-y-2">
          {loading ? (
            <li className="text-sm text-white/40">Loading…</li>
          ) : lessons.length === 0 ? (
            <li className="text-sm text-white/40">Knowledge capture begins at session completion.</li>
          ) : (
            lessons.map((r) => (
              <li key={r.id} className="rounded-lg border border-white/5 p-3 text-xs">
                {r.sourceSessionId ? (
                  <Link href={`/sai/sessions/${r.sourceSessionId}?tab=knowledge`} className="text-white hover:text-purple-200">
                    {r.title}
                  </Link>
                ) : (
                  <p className="text-white">{r.title}</p>
                )}
                <p className="mt-1 text-white/45">{r.summary}</p>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="enterprise-glass rounded-xl border border-red-400/15 p-5 lg:col-span-2">
        <h3 className="text-sm font-semibold text-white">Risks & Recommendations</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[10px] uppercase text-red-300/70">Recommendations</p>
            <ul className="mt-2 space-y-2">
              {risks.length === 0 ? (
                <li className="text-sm text-white/40">No recommendations captured yet.</li>
              ) : (
                risks.map((r) => (
                  <li key={r.id} className="text-xs text-white/55">
                    {r.summary}
                  </li>
                ))
              )}
            </ul>
          </div>
          <div>
            <p className="text-[10px] uppercase text-cyan-300/70">Company Records</p>
            <p className="mt-2 text-xs text-white/55">
              {summary ? `${summary.total} total records indexed for organizational search.` : "Connect database to activate intelligence."}
            </p>
            <Link href="/sai/records" className="mt-2 inline-block text-xs text-purple-300 hover:underline">
              Browse all records →
            </Link>
          </div>
        </div>
      </section>
    </div>
    </div>
  );
}

function AnalyticsSection({ timeline, metrics }: { timeline: FounderSessionTimelineData; metrics: ReturnType<typeof buildSessionCenterDashboard> }) {
  const total =
    timeline.activeSessions.length +
    timeline.completedSessions.length +
    timeline.archivedSessions.length +
    timeline.cancelledSessions.length +
    timeline.blockedSessions.length;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total Sessions" value={total} />
        <MetricCard label="Completion Rate" value={`${metrics.completionRate}%`} />
        <MetricCard label="Knowledge Captured" value={metrics.knowledgeCaptured} />
        <MetricCard label="Automation Success" value={`${metrics.automationActive} active`} />
      </div>
      <section className="enterprise-glass rounded-xl border border-white/10 p-5">
        <h3 className="text-sm font-semibold text-white">Execution Throughput</h3>
        <p className="mt-2 text-xs text-white/45">
          {metrics.completedThisWeek} sessions completed in the last 7 days · {metrics.activeSessions} currently executing
        </p>
      </section>
    </div>
  );
}

function SettingsSection() {
  return (
    <section className="enterprise-glass rounded-xl border border-white/10 p-5">
      <h3 className="text-sm font-semibold text-white">Session Center Configuration</h3>
      <ul className="mt-4 space-y-2 text-sm text-white/55">
        <li>Knowledge capture is mandatory before session completion</li>
        <li>All sessions become permanent searchable records</li>
        <li>Session lifecycle: Draft → Planning → Ready → Executing → Review → Approval → Knowledge Capture → Completed</li>
      </ul>
      <Link href="/sai/settings?tab=governance" className="mt-4 inline-block text-xs text-purple-300 hover:underline">
        Company Settings → Governance
      </Link>
    </section>
  );
}

export function SessionCenterView({
  initialTimeline,
  section,
  projects,
  agents,
  duties,
  automations,
  templates,
  archetypes,
  customAgents,
  tools,
  isAdmin,
}: Props) {
  const router = useRouter();
  const refreshPage = useDebouncedRouterRefresh(5_000);
  const [timeline, setTimeline] = useState(initialTimeline);
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const activeSection = section ?? "dashboard";
  const title = SESSION_CENTER_SECTION_TITLES[activeSection] ?? "Session Center";
  const metrics = useMemo(
    () =>
      buildSessionCenterDashboard(timeline, {
        automationActive: automations.filter((a) => a.status === "active").length,
      }),
    [timeline, automations],
  );

  useEffect(() => {
    setTimeline(initialTimeline);
  }, [initialTimeline]);

  const refreshTimeline = useCallback(async () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    const route = `/api/sai/founder/timeline${params.size ? `?${params}` : ""}`;
    const res = await fetch(route);
    const data = await parseJsonResponse<FounderSessionTimelineData>(res, route);
    setTimeline(data);
  }, [search]);

  const { connected } = useSaiRealtimeSync(
    () => {
      refreshTimeline().catch(() => {});
      refreshPage();
    },
    ["workflow_runs", "workflow_approvals", "session_artifacts", "session_handoffs", "activity_feed", "company_records"],
    { debounceMs: 2000, minIntervalMs: 4000 },
  );

  useEffect(() => {
    refreshTimeline().catch(() => {});
  }, [search, refreshTimeline]);

  async function handleApprovalDecision(id: string, decision: string) {
    setLoadingId(id);
    try {
      await decideApprovalAction(
        id,
        decision as "approved" | "rejected" | "revision_required" | "escalated",
      );
      await refreshTimeline();
      refreshPage();
      router.refresh();
    } catch (error) {
      alert(formatClientApiError(error));
    } finally {
      setLoadingId(null);
    }
  }

  const registryRows = getRegistryRows(timeline, activeSection);
  const allSessionCount = getAllSessionRows(timeline).length;
  const isRegistry = activeSection.startsWith("registry-");

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/70">
            Session Center · Company Execution Engine
          </p>
          <h1 className="mt-1 text-2xl font-bold text-white md:text-3xl">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-white/55">
            Objectives become sessions. Sessions become execution. Execution becomes knowledge.
            Knowledge becomes organizational intelligence.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[10px] text-white/40">
            <span className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-400" : "bg-amber-400"}`} />
            {connected ? "Live sync" : "Polling every 12s"}
          </div>
          {isRegistry && (
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sessions…"
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white"
            />
          )}
        </div>
      </header>

      {(activeSection === "dashboard" || !section) && (
        <>
          <DashboardSection
            timeline={timeline}
            metrics={metrics}
            onApprovalDecision={handleApprovalDecision}
            loadingId={loadingId}
          />
          {isAdmin && <SessionCreatePanel projects={projects} templates={templates} />}
        </>
      )}

      {isRegistry && (
        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-white/45">
              Showing {registryRows.length} session{registryRows.length === 1 ? "" : "s"}
              {activeSection !== "registry-all" ? ` · ${allSessionCount} total in COS` : ""}
            </p>
            {activeSection !== "registry-all" && (
              <Link href="/sai/sessions?section=registry-all" className="text-xs text-purple-300 hover:underline">
                View all sessions →
              </Link>
            )}
          </div>
          {activeSection === "registry-approval" ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-white">Founder Approval Queue</h3>
                <p className="mt-1 text-xs text-white/45">
                  Green Approve buttons act on workflow approvals. Per-session Approve appears in the table when linked.
                </p>
                <div className="mt-4">
                  <ApprovalQueue
                    items={timeline.awaitingFounderApproval}
                    onDecision={handleApprovalDecision}
                    loadingId={loadingId}
                  />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Sessions Waiting Approval</h3>
                <div className="mt-4">
                  <SessionRegistryTable
                    rows={timeline.awaitingApprovalSessions}
                    pendingApprovals={timeline.awaitingFounderApproval}
                    onApprovalDecision={handleApprovalDecision}
                    loadingApprovalId={loadingId}
                  />
                </div>
              </div>
            </div>
          ) : registryRows.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-white/50">No sessions in this registry view.</p>
              <Link href="/sai/sessions?section=registry-all" className="mt-2 inline-block text-xs text-purple-300 hover:underline">
                View all {allSessionCount} sessions →
              </Link>
            </div>
          ) : (
            <SessionRegistryTable
              rows={registryRows}
              pendingApprovals={timeline.awaitingFounderApproval}
              onApprovalDecision={handleApprovalDecision}
              loadingApprovalId={loadingId}
              showStatusFilter={activeSection === "registry-all"}
            />
          )}
        </section>
      )}

      {activeSection === "templates" && <TemplatesSection templates={templates} />}
      {activeSection === "duties" && (
        <SchedulerDutiesSection duties={duties} automations={automations} isAdmin={isAdmin} />
      )}
      {activeSection === "automation" && (
        <SchedulerDutiesSection duties={duties} automations={automations} isAdmin={isAdmin} />
      )}
      {activeSection === "agents" && (
        <AgentsSection
          agents={agents}
          archetypes={archetypes}
          customAgents={customAgents}
          tools={tools}
          isAdmin={isAdmin}
        />
      )}
      {activeSection === "intelligence" && <IntelligenceSection />}
      {activeSection === "analytics" && <AnalyticsSection timeline={timeline} metrics={metrics} />}
      {activeSection === "settings" && <SettingsSection />}
    </div>
  );
}
