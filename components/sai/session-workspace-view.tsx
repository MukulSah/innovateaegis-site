"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FounderSessionDetailPanel } from "@/components/sai/founder-session-detail-panel";
import { SessionControlPanel } from "@/components/sai/session-control-panel";
import { SessionCosAskInline } from "@/components/sai/session-cos-ask-inline";
import { FounderSessionTimelinePanel } from "@/components/sai/founder-session-timeline-panel";
import { formatClientApiError } from "@/lib/sai/client-api";
import type { SessionTruth } from "@/lib/sai/session-truth-engine";
import type { ExecutiveTimelineEntry } from "@/lib/sai/executive-timeline";
import { loadSessionWorkspaceAction } from "@/lib/sai/session-workspace-actions";
import { useDebouncedRouterRefresh } from "@/lib/sai/use-debounced-router-refresh";
import { useSaiRealtimeSync } from "@/lib/sai/use-sai-realtime-sync";

type Tab =
  | "mission"
  | "execution"
  | "team"
  | "timeline"
  | "artifacts"
  | "decisions"
  | "approvals"
  | "risks"
  | "knowledge"
  | "session-file";

type WorkspacePayload = {
  truth: SessionTruth;
  progress: number;
  artifacts: {
    id: string;
    stepKey: string;
    artifactName: string | null;
    artifactType: string | null;
    createdAt: string;
    outputSummary?: string;
  }[];
  executiveTimeline: ExecutiveTimelineEntry[];
  analytics: {
    artifactCount: number;
    pendingApprovalCount: number;
    handoffCount: number;
    progress: number;
    executionHealth: number;
    strategicHealth: number;
    isComplete: boolean;
  };
  memory: { title: string; summary: string; memoryType: string; createdAt: string }[];
  intelligence: {
    outcomeSummary: string;
    lessonsLearned: string[];
    failures: string[];
    wins: string[];
    recommendations: string[];
    reusableKnowledge: string[];
    extractionStatus: string;
    extractedAt: string | null;
  } | null;
  records: {
    id: string;
    recordType: string;
    title: string;
    summary: string;
    createdAt: string;
  }[];
};

const TABS: { id: Tab; label: string }[] = [
  { id: "mission", label: "Mission" },
  { id: "execution", label: "Execution" },
  { id: "team", label: "Team" },
  { id: "timeline", label: "Timeline" },
  { id: "artifacts", label: "Artifacts" },
  { id: "decisions", label: "Decisions" },
  { id: "approvals", label: "Approvals" },
  { id: "risks", label: "Risks" },
  { id: "knowledge", label: "Knowledge" },
  { id: "session-file", label: "Session File" },
];

const VALID_TABS = new Set(TABS.map((t) => t.id));

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function inferRiskLevel(truth: SessionTruth, analytics: WorkspacePayload["analytics"]): string {
  if (truth.sessionStatus === "blocked" || truth.sessionStatus === "stalled") return "high";
  if (analytics.pendingApprovalCount > 0) return "medium";
  if (truth.executionHealth < 50) return "medium";
  return "low";
}

export function SessionWorkspaceView({ sessionId }: { sessionId: string }) {
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab");
  const initialTab = rawTab && VALID_TABS.has(rawTab as Tab) ? (rawTab as Tab) : "mission";

  const refreshPage = useDebouncedRouterRefresh(15_000);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [data, setData] = useState<WorkspacePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const payload = await loadSessionWorkspaceAction(sessionId);
      if (!payload) throw new Error("Session not found");
      setData(payload as WorkspacePayload);
    } catch (err) {
      setError(formatClientApiError(err, "Session Workspace"));
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useSaiRealtimeSync(() => {
    load().catch(() => {});
  }, ["workflow_runs", "workflow_approvals", "session_artifacts", "session_handoffs"], {
    debounceMs: 2500,
    minIntervalMs: 8000,
  });

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (rawTab && VALID_TABS.has(rawTab as Tab)) {
      setTab(rawTab as Tab);
    }
  }, [rawTab]);

  if (loading && !data) {
    return <div className="animate-pulse rounded-xl border border-white/10 p-8 text-sm text-white/40">Loading mission control…</div>;
  }

  if (error && !data) {
    return <div className="rounded-xl border border-red-400/20 bg-red-500/5 p-6 text-sm text-red-200">{error}</div>;
  }

  if (!data) return null;

  const { truth, artifacts, executiveTimeline, analytics, memory, intelligence, records } = data;
  const riskLevel = inferRiskLevel(truth, analytics);
  const activeTab = TABS.find((t) => t.id === tab);
  const ceoArtifact = artifacts.find((a) => a.stepKey === "ceo_strategy");
  const cooArtifact = artifacts.find((a) => a.stepKey === "coo_execution");
  const execReview = artifacts.find((a) => a.artifactName === "executive_review_v1");
  const decisionEvents = executiveTimeline.filter(
    (e) => e.eventType.includes("approval") || e.eventType.includes("decision"),
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Progress" value={`${analytics.progress}%`} />
        <Stat label="Execution Health" value={`${analytics.executionHealth}%`} />
        <Stat label="Risk Level" value={riskLevel} />
        <Stat label="Pending Approvals" value={String(analytics.pendingApprovalCount)} />
        <Stat label="Status" value={truth.sessionStatus.replace(/_/g, " ")} />
      </div>

      <nav className="flex flex-wrap gap-1 border-b border-white/10 pb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-xs transition-colors ${
              tab === t.id ? "bg-cyan-500/20 text-cyan-100" : "text-white/50 hover:bg-white/5 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <SessionControlPanel sessionId={sessionId} truth={truth} />

      {tab === "mission" && (
        <div className="space-y-5">
          <section className="enterprise-glass rounded-xl border border-cyan-400/20 p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-cyan-300/70">Mission</h3>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-[10px] uppercase text-white/40">Business Objective</dt>
                <dd className="mt-1 text-sm text-white">{truth.objective}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase text-white/40">Expected Outcome</dt>
                <dd className="mt-1 text-sm text-white/70">
                  {truth.currentDeliverable ?? "Defined during planning and execution stages"}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase text-white/40">Success Criteria</dt>
                <dd className="mt-1 text-sm text-white/70">
                  {truth.isComplete
                    ? "Session completed with knowledge captured"
                    : "Executive review, artifact delivery, and knowledge archive"}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase text-white/40">Executive Sponsor</dt>
                <dd className="mt-1 text-sm text-white/70">{truth.executiveSponsorName ?? "CEO"}</dd>
              </div>
            </dl>
          </section>
          <div className="grid gap-5 lg:grid-cols-2">
            <ReviewCard title="CEO Strategic Review" artifact={ceoArtifact} empty="No CEO strategic review artifact yet." />
            <ReviewCard title="COO Execution Plan" artifact={cooArtifact} empty="No COO execution plan artifact yet." />
          </div>
          {execReview && <ReviewCard title="Executive Review" artifact={execReview} empty="" />}
        </div>
      )}

      {tab === "execution" && (
        <div className="space-y-5">
          <FounderSessionDetailPanel sessionId={sessionId} />
          <section className="enterprise-glass rounded-xl border border-white/10 p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">Execution Status</h3>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Current Stage" value={truth.currentStage ?? truth.workflowStage ?? "—"} />
              <Stat label="Current Owner" value={truth.sessionOwnerName ?? "—"} />
              <Stat label="Current Agent" value={truth.currentAgentName ?? "—"} />
              <Stat label="Next Agent" value={truth.nextAgentName ?? "—"} />
              <Stat label="Health Score" value={`${truth.executionHealth}%`} />
              <Stat label="Strategic Health" value={`${truth.strategicHealth}%`} />
              <Stat label="Knowledge Complete" value={truth.knowledgeComplete ? "Yes" : "No"} />
              <Stat label="Queue" value={truth.queueActive ? "Active" : "Idle"} />
            </dl>
          </section>
        </div>
      )}

      {tab === "team" && (
        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h3 className="text-sm font-semibold text-white">Execution Team</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { role: "Executive Sponsor", name: truth.executiveSponsorName, status: "assigned" },
              { role: "Session Owner", name: truth.sessionOwnerName, status: "assigned" },
              { role: "Current Agent", name: truth.currentAgentName, status: truth.currentAgentName ? "active" : "idle" },
              { role: "Next Agent", name: truth.nextAgentName, status: "queued" },
            ].map((member) => (
              <div key={member.role} className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
                <p className="text-[10px] uppercase text-white/40">{member.role}</p>
                <p className="mt-1 text-sm font-medium text-white">{member.name ?? "Unassigned"}</p>
                <p className="mt-1 text-[10px] capitalize text-purple-300/70">{member.status}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-white/40">
            {analytics.handoffCount} handoff(s) recorded · {analytics.artifactCount} artifact(s) produced
          </p>
        </section>
      )}

      {tab === "timeline" && (
        <div className="space-y-5">
          <FounderSessionTimelinePanel
            sessionId={truth.sessionId}
            sessionNumber={truth.sessionNumber}
            objective={truth.objective}
            timeline={truth.timeline}
            isComplete={truth.isComplete}
          />
          <section className="enterprise-glass rounded-xl border border-white/10 p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">Complete History</h3>
            <ul className="mt-3 max-h-[480px] space-y-2 overflow-y-auto">
              {executiveTimeline.length === 0 ? (
                <li className="text-sm text-white/40">No timeline events recorded yet.</li>
              ) : (
                executiveTimeline.map((e) => (
                  <li key={e.id} className="flex gap-3 border-b border-white/5 pb-2 text-xs">
                    <span className="shrink-0 text-white/35">{formatWhen(e.timestamp)}</span>
                    <div>
                      <p className="text-white/85">{e.title}</p>
                      <p className="text-white/45">
                        {e.actor} · {e.source} · {e.eventType.replace(/_/g, " ")}
                      </p>
                      {e.description && <p className="mt-1 text-white/40">{e.description}</p>}
                    </div>
                  </li>
                ))
              )}
            </ul>
          </section>
        </div>
      )}

      {tab === "artifacts" && (
        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h3 className="text-sm font-semibold text-white">Session Artifacts ({artifacts.length})</h3>
          <p className="mt-1 text-xs text-white/45">
            Requirements, plans, reports, code deliverables, and documentation — permanently attached to this session.
          </p>
          <ul className="mt-4 space-y-3">
            {artifacts.length === 0 ? (
              <li className="text-sm text-white/40">No artifacts generated yet.</li>
            ) : (
              artifacts.map((a) => (
                <li key={a.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-sm text-cyan-300">{a.artifactName ?? a.stepKey}</span>
                    <span className="text-[10px] text-white/40">{formatWhen(a.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-[10px] uppercase text-white/35">{a.stepKey} · {a.artifactType ?? "artifact"}</p>
                  {a.outputSummary && (
                    <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-black/30 p-3 text-xs text-white/70">
                      {a.outputSummary.slice(0, 2000)}
                      {a.outputSummary.length > 2000 ? "…" : ""}
                    </pre>
                  )}
                </li>
              ))
            )}
          </ul>
        </section>
      )}

      {tab === "decisions" && (
        <section className="enterprise-glass rounded-xl border border-white/10 p-5">
          <h3 className="text-sm font-semibold text-white">Decisions</h3>
          <ul className="mt-4 space-y-3">
            {decisionEvents.length === 0 ? (
              <li className="text-sm text-white/40">No decisions recorded yet.</li>
            ) : (
              decisionEvents.map((e) => (
                <li key={e.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-4">
                  <p className="text-sm font-medium text-white">{e.title}</p>
                  <p className="mt-1 text-xs text-white/50">{e.description ?? e.eventType.replace(/_/g, " ")}</p>
                  <p className="mt-2 text-[10px] text-white/35">
                    {e.actor} · {formatWhen(e.timestamp)}
                  </p>
                </li>
              ))
            )}
          </ul>
        </section>
      )}

      {tab === "approvals" && (
        <section className="enterprise-glass rounded-xl border border-amber-400/20 p-5">
          <h3 className="text-sm font-semibold text-white">Approvals</h3>
          <p className="mt-1 text-xs text-white/45">
            {analytics.pendingApprovalCount} pending approval(s) for this session
          </p>
          <p className="mt-4 text-sm text-white/50">
            Approval workflow is managed in the Execution panel. Open Execution tab for inline approve/reject actions.
          </p>
        </section>
      )}

      {tab === "risks" && (
        <section className="enterprise-glass rounded-xl border border-red-400/15 p-5">
          <h3 className="text-sm font-semibold text-white">Risk Register</h3>
          <div className="mt-4 space-y-3">
            {truth.lastError && (
              <div className="rounded-lg border border-red-400/20 bg-red-500/5 p-4">
                <p className="text-[10px] uppercase text-red-300/70">Active Error</p>
                <p className="mt-1 text-sm text-white">{truth.lastError}</p>
              </div>
            )}
            {truth.finalizationBlockedReason && (
              <div className="rounded-lg border border-amber-400/20 bg-amber-500/5 p-4">
                <p className="text-[10px] uppercase text-amber-300/70">Finalization Blocked</p>
                <p className="mt-1 text-sm text-white">{truth.finalizationBlockedReason}</p>
              </div>
            )}
            {!truth.lastError && !truth.finalizationBlockedReason && riskLevel === "low" && (
              <p className="text-sm text-white/40">No active risks detected for this session.</p>
            )}
            <dl className="grid gap-3 sm:grid-cols-3">
              <Stat label="Risk Level" value={riskLevel} />
              <Stat label="Execution Health" value={`${truth.executionHealth}%`} />
              <Stat label="Knowledge Gate" value={truth.knowledgeComplete ? "Passed" : "Pending"} />
            </dl>
          </div>
        </section>
      )}

      {tab === "knowledge" && (
        <section className="enterprise-glass rounded-xl border border-purple-400/20 p-5">
          <h3 className="text-sm font-semibold text-white">Knowledge Capture</h3>
          <p className="mt-1 text-xs text-white/45">
            Lessons learned, patterns, and recommendations — mandatory before session closure.
          </p>
          {intelligence && (
            <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] p-4">
              <p className="text-[10px] uppercase text-purple-300/70">
                Extraction: {intelligence.extractionStatus}
                {intelligence.extractedAt ? ` · ${formatWhen(intelligence.extractedAt)}` : ""}
              </p>
              {intelligence.outcomeSummary && (
                <p className="mt-2 text-sm text-white/70">{intelligence.outcomeSummary}</p>
              )}
              {intelligence.lessonsLearned.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs text-white/55">
                  {intelligence.lessonsLearned.map((lesson, i) => (
                    <li key={i}>• {lesson.slice(0, 300)}</li>
                  ))}
                </ul>
              )}
              {intelligence.recommendations.length > 0 && (
                <div className="mt-3">
                  <p className="text-[10px] uppercase text-cyan-300/70">Recommendations</p>
                  <ul className="mt-1 space-y-1 text-xs text-white/55">
                    {intelligence.recommendations.map((r, i) => (
                      <li key={i}>• {r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <ul className="mt-4 space-y-3">
            {memory.length === 0 && !intelligence ? (
              <li className="text-sm text-white/40">No knowledge captured yet.</li>
            ) : (
              memory.map((m, i) => (
                <li key={`${m.title}-${i}`} className="rounded-lg border border-white/10 p-3">
                  <p className="text-[10px] uppercase text-purple-300/70">{m.memoryType}</p>
                  <p className="mt-1 font-medium text-white">{m.title}</p>
                  <p className="mt-1 text-xs text-white/50">{m.summary}</p>
                  <p className="mt-1 text-[10px] text-white/30">{formatWhen(m.createdAt)}</p>
                </li>
              ))
            )}
          </ul>
          <Link href="/sai/records" className="mt-4 inline-block text-xs text-purple-300 hover:underline">
            View Records Center →
          </Link>
        </section>
      )}

      {tab === "session-file" && (
        <section className="enterprise-glass rounded-xl border border-purple-400/20 p-5">
          <h3 className="text-sm font-semibold text-white">Session File</h3>
          <p className="mt-1 text-xs text-white/45">
            Permanent execution memory — searchable company record of this session.
          </p>
          <div className="mt-4 space-y-4 rounded-lg border border-white/10 bg-black/20 p-5 font-mono text-xs text-white/70">
            <p className="text-purple-300"># Session #{truth.sessionNumber} — {truth.projectName}</p>
            <p>Objective: {truth.objective}</p>
            <p>Status: {truth.sessionStatus}</p>
            <p>Created: {truth.createdAt ? formatWhen(truth.createdAt) : "—"}</p>
            <p>Progress: {analytics.progress}%</p>
            <p>Artifacts: {analytics.artifactCount}</p>
            <p>Knowledge Complete: {truth.knowledgeComplete ? "Yes" : "No"}</p>
            <p>Final Report: {truth.finalReportExists ? "Yes" : "No"}</p>
            <p>Executive Review: {truth.executiveReviewExists ? "Yes" : "No"}</p>
            {intelligence?.outcomeSummary && (
              <>
                <hr className="border-white/10" />
                <p className="text-white/50">{intelligence.outcomeSummary}</p>
              </>
            )}
          </div>
          {records.length > 0 && (
            <ul className="mt-4 space-y-2">
              {records.map((r) => (
                <li key={r.id} className="rounded-lg border border-white/10 p-3 text-xs">
                  <p className="text-[10px] uppercase text-purple-300/70">{r.recordType.replace(/_/g, " ")}</p>
                  <p className="mt-1 font-medium text-white">{r.title}</p>
                  <p className="mt-1 text-white/50">{r.summary}</p>
                  <p className="mt-1 text-[10px] text-white/30">{formatWhen(r.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
          <Link href={`/sai/records?sessionId=${sessionId}`} className="mt-4 inline-block text-xs text-purple-300 hover:underline">
            Open in Records Center →
          </Link>
        </section>
      )}

      {activeTab && (
        <SessionCosAskInline sessionId={sessionId} tab={tab} tabLabel={activeTab.label} />
      )}

      <button
        type="button"
        onClick={() => {
          load();
          refreshPage();
        }}
        className="text-xs text-white/40 hover:text-white/70"
      >
        Refresh mission control
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.04] p-3">
      <dt className="text-[10px] text-white/40">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold capitalize text-white">{value}</dd>
    </div>
  );
}

function ReviewCard({
  title,
  artifact,
  empty,
}: {
  title: string;
  artifact?: { artifactName: string | null; outputSummary?: string; createdAt: string };
  empty: string;
}) {
  return (
    <section className="enterprise-glass rounded-xl border border-white/10 p-5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-white/50">{title}</h3>
      {!artifact ? (
        <p className="mt-3 text-sm text-white/40">{empty}</p>
      ) : (
        <>
          <p className="mt-2 font-mono text-sm text-purple-300">{artifact.artifactName}</p>
          <p className="mt-1 text-[10px] text-white/35">{formatWhen(artifact.createdAt)}</p>
          {artifact.outputSummary && (
            <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-black/30 p-3 text-xs text-white/70">
              {artifact.outputSummary.slice(0, 1500)}
            </pre>
          )}
        </>
      )}
    </section>
  );
}
