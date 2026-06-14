"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { FounderSessionDetailPanel } from "@/components/sai/founder-session-detail-panel";
import { FounderSessionSidebar } from "@/components/sai/founder-session-sidebar";
import { collectFounderSessionIds } from "@/lib/sai/founder-session-ids";
import type {
  FounderAwaitingApproval,
  FounderSessionRow,
  FounderSessionTimelineData,
} from "@/lib/sai/founder-timeline";
import type { ApprovalHistoryEntry } from "@/lib/sai/approval-history";
import type { ExecutiveTimelineEntry } from "@/lib/sai/executive-timeline";
import { formatClientApiError, parseJsonResponse } from "@/lib/sai/client-api";
import { useDebouncedRouterRefresh } from "@/lib/sai/use-debounced-router-refresh";
import { useSaiRealtimeSync } from "@/lib/sai/use-sai-realtime-sync";

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function SessionTable({
  rows,
  showCompletion = false,
  selectedId,
  onSelect,
}: {
  rows: FounderSessionRow[];
  showCompletion?: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (!rows.length) {
    return <p className="text-sm text-white/40">No sessions in this category.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-xs">
        <thead>
          <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-white/40">
            <th className="py-2 pr-3">Session</th>
            <th className="py-2 pr-3">Project</th>
            <th className="py-2 pr-3">Objective</th>
            <th className="py-2 pr-3">Agent</th>
            <th className="py-2 pr-3">Deliverable</th>
            <th className="py-2 pr-3">Health</th>
            <th className="py-2 pr-3">Status</th>
            {showCompletion && <th className="py-2 pr-3">Completed</th>}
            <th className="py-2">Last Activity</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={`cursor-pointer border-b border-white/5 transition-colors hover:bg-white/[0.04] ${
                selectedId === s.id ? "bg-purple-500/10" : ""
              }`}
            >
              <td className="py-2 pr-3">
                <Link
                  href={`/sai/sessions/${s.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-purple-300 hover:underline"
                >
                  #{s.sessionNumber ?? "—"}
                </Link>
              </td>
              <td className="py-2 pr-3 text-white/70">{s.projectName}</td>
              <td className="max-w-[200px] truncate py-2 pr-3 text-white/85">{s.objective}</td>
              <td className="py-2 pr-3 text-white/60">{s.currentAgentName ?? "—"}</td>
              <td className="py-2 pr-3 text-white/60">{s.currentDeliverable ?? "—"}</td>
              <td className="py-2 pr-3">
                <span className="text-emerald-300">{s.executionHealth}%</span>
                <span className="text-white/30"> / </span>
                <span className="text-purple-300">{s.strategicHealth}%</span>
              </td>
              <td className="py-2 pr-3 capitalize text-white/55">{s.sessionStatus.replace(/_/g, " ")}</td>
              {showCompletion && (
                <td className="py-2 pr-3 text-white/50">{formatWhen(s.completedAt)}</td>
              )}
              <td className="py-2 text-white/45">{formatWhen(s.lastActivityAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AwaitingApprovalSection({
  items,
  onDecision,
  loadingId,
}: {
  items: FounderAwaitingApproval[];
  onDecision: (id: string, decision: string) => void;
  loadingId: string | null;
}) {
  if (!items.length) {
    return <p className="text-sm text-white/40">No approvals awaiting founder action.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((a) => (
        <div key={a.id} className="rounded-xl border border-amber-400/20 bg-amber-500/5 p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-amber-200/70">
                {a.approvalType.replace(/_/g, " ")} · {a.impact} impact · waiting {a.waitingHours}h
              </p>
              <p className="mt-1 font-medium text-white">{a.title}</p>
              <p className="mt-1 text-xs text-white/50">
                {a.projectName}
                {a.sessionNumber != null ? ` · Session #${a.sessionNumber}` : ""} · Requested by{" "}
                {a.requestedBy}
              </p>
            </div>
            <Link href={`/sai/approvals/${a.id}`} className="text-xs text-purple-300 hover:underline">
              View Details →
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(["approved", "rejected", "revision_required"] as const).map((decision) => (
              <button
                key={decision}
                type="button"
                disabled={loadingId === a.id}
                onClick={() => onDecision(a.id, decision)}
                className="rounded-lg border border-white/15 bg-white/5 px-3 py-1 text-[10px] capitalize text-white hover:bg-white/10 disabled:opacity-50"
              >
                {decision.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

type RegistrySection = "active" | "approvals" | "blocked" | "completed" | "archived" | "history";

export function FounderCommandCenterView({ initialTimeline }: { initialTimeline: FounderSessionTimelineData }) {
  const refreshPage = useDebouncedRouterRefresh(15_000);
  const [timeline, setTimeline] = useState(initialTimeline);
  const allIds = useMemo(() => collectFounderSessionIds(initialTimeline), [initialTimeline]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(
    initialTimeline.activeSessions[0]?.id ?? initialTimeline.completedSessions[0]?.id ?? allIds[0] ?? null,
  );
  const [search, setSearch] = useState("");
  const [registryOpen, setRegistryOpen] = useState<RegistrySection | null>(null);
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistoryEntry[]>([]);
  const [executiveTimeline, setExecutiveTimeline] = useState<ExecutiveTimelineEntry[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [syncVersion, setSyncVersion] = useState<string | null>(null);

  const refreshTimeline = useCallback(async () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    const route = `/api/sai/founder/timeline${params.size ? `?${params}` : ""}`;
    const res = await fetch(route);
    const data = await parseJsonResponse<FounderSessionTimelineData>(res, route);
    setTimeline(data);
    setLastSync(new Date().toLocaleTimeString());

    const ids = collectFounderSessionIds(data);
    if (selectedSessionId && !ids.includes(selectedSessionId)) {
      setSelectedSessionId(data.activeSessions[0]?.id ?? data.completedSessions[0]?.id ?? ids[0] ?? null);
    }
  }, [search, selectedSessionId]);

  useSaiRealtimeSync(() => {
    refreshTimeline().catch(() => {});
  }, [
    "workflow_runs",
    "workflow_approvals",
    "workflow_run_steps",
    "session_artifacts",
    "session_handoffs",
    "activity_feed",
    "ai_retry_queue",
  ], { debounceMs: 2500, minIntervalMs: 8000 });

  useEffect(() => {
    fetch("/api/sai/founder/approval-history")
      .then(async (r) => {
        const d = await parseJsonResponse<{ history: ApprovalHistoryEntry[] }>(r, "/api/sai/founder/approval-history");
        setApprovalHistory(d.history ?? []);
      })
      .catch(() => {});

    fetch("/api/sai/founder/approval-history?view=executive")
      .then(async (r) => {
        const d = await parseJsonResponse<{ timeline: ExecutiveTimelineEntry[] }>(
          r,
          "/api/sai/founder/approval-history?view=executive",
        );
        setExecutiveTimeline(d.timeline ?? []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch("/api/sai/founder/events?syncOnly=1");
        const data = await parseJsonResponse<{ version: string }>(res, "/api/sai/founder/events?syncOnly=1");
        if (cancelled) return;
        if (syncVersion && data.version !== syncVersion) {
          await refreshTimeline();
        }
        setSyncVersion(data.version);
      } catch {
        // polling fallback
      }
    }

    poll();
    const id = setInterval(poll, 10_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [syncVersion, refreshTimeline]);

  async function handleApprovalDecision(id: string, decision: string) {
    setLoadingId(id);
    try {
      const route = `/api/sai/approvals/${id}`;
      const res = await fetch(route, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, comments: "" }),
      });
      await parseJsonResponse(res, route);
      await refreshTimeline();
      refreshPage();
    } catch (error) {
      alert(formatClientApiError(error));
    } finally {
      setLoadingId(null);
    }
  }

  function toggleRegistry(section: RegistrySection) {
    setRegistryOpen((prev) => (prev === section ? null : section));
  }

  return (
    <div className="flex min-h-[640px] overflow-hidden rounded-xl border border-purple-400/15 bg-[#06061a]/50">
      <FounderSessionSidebar
        timeline={timeline}
        selectedId={selectedSessionId}
        searchQuery={search}
        onSelect={setSelectedSessionId}
      />

      <div className="min-w-0 flex-1 overflow-y-auto">
        {/* Toolbar */}
        <div className="sticky top-0 z-10 border-b border-white/10 bg-[#06061a]/95 px-5 py-4 backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-purple-300/70">Session Center</p>
              <p className="text-xs text-white/45">
                Live truth from workflow_runs · {collectFounderSessionIds(timeline).length} sessions preserved
                {lastSync ? ` · synced ${lastSync}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter sessions…"
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white"
              />
              <button
                type="button"
                onClick={() => refreshTimeline()}
                className="rounded-lg border border-purple-400/30 bg-purple-500/10 px-3 py-1.5 text-xs text-purple-200"
              >
                Refresh all
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-5">
          {/* Primary: selected session detail */}
          <FounderSessionDetailPanel
            sessionId={selectedSessionId}
            onApprovalDecision={handleApprovalDecision}
          />

          {/* Collapsible session registry */}
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Session Registry</p>

            <RegistryAccordion
              title={`Active Sessions (${timeline.activeSessions.length})`}
              open={registryOpen === "active"}
              onToggle={() => toggleRegistry("active")}
              borderClass="border-emerald-400/20"
            >
              <SessionTable
                rows={timeline.activeSessions}
                selectedId={selectedSessionId}
                onSelect={setSelectedSessionId}
              />
            </RegistryAccordion>

            <RegistryAccordion
              title={`Awaiting Approval (${timeline.awaitingFounderApproval.length})`}
              open={registryOpen === "approvals"}
              onToggle={() => toggleRegistry("approvals")}
              borderClass="border-amber-400/20"
            >
              <AwaitingApprovalSection
                items={timeline.awaitingFounderApproval}
                onDecision={handleApprovalDecision}
                loadingId={loadingId}
              />
            </RegistryAccordion>

            {(timeline.blockedSessions.length > 0 || timeline.needsFounderReview.length > 0) && (
              <RegistryAccordion
                title="Blocked & Needs Review"
                open={registryOpen === "blocked"}
                onToggle={() => toggleRegistry("blocked")}
                borderClass="border-red-400/20"
              >
                <div className="space-y-4">
                  {timeline.blockedSessions.length > 0 && (
                    <SessionTable
                      rows={timeline.blockedSessions}
                      selectedId={selectedSessionId}
                      onSelect={setSelectedSessionId}
                    />
                  )}
                  {timeline.needsFounderReview.length > 0 && (
                    <SessionTable
                      rows={timeline.needsFounderReview}
                      selectedId={selectedSessionId}
                      onSelect={setSelectedSessionId}
                    />
                  )}
                </div>
              </RegistryAccordion>
            )}

            <RegistryAccordion
              title={`Completed (${timeline.completedSessions.length})`}
              open={registryOpen === "completed"}
              onToggle={() => toggleRegistry("completed")}
              borderClass="border-white/10"
            >
              <SessionTable
                rows={timeline.completedSessions}
                showCompletion
                selectedId={selectedSessionId}
                onSelect={setSelectedSessionId}
              />
            </RegistryAccordion>

            <RegistryAccordion
              title={`Archived (${timeline.archivedSessions.length})`}
              open={registryOpen === "archived"}
              onToggle={() => toggleRegistry("archived")}
              borderClass="border-white/10"
            >
              <SessionTable
                rows={timeline.archivedSessions}
                showCompletion
                selectedId={selectedSessionId}
                onSelect={setSelectedSessionId}
              />
            </RegistryAccordion>

            <RegistryAccordion
              title="Company History"
              open={registryOpen === "history"}
              onToggle={() => toggleRegistry("history")}
              borderClass="border-purple-400/20"
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <h4 className="mb-2 text-[10px] uppercase text-white/40">Approval Timeline</h4>
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {approvalHistory.slice(0, 20).map((h) => (
                      <div key={h.id} className="rounded-lg border border-white/5 p-2 text-xs">
                        <p className="font-medium text-white">{h.title}</p>
                        <p className="mt-0.5 text-white/45">
                          {h.decision.replace(/_/g, " ")} · {formatWhen(h.decidedAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="mb-2 text-[10px] uppercase text-white/40">Executive Timeline</h4>
                  <div className="max-h-64 space-y-2 overflow-y-auto">
                    {executiveTimeline.slice(0, 20).map((e) => (
                      <div key={e.id} className="border-b border-white/5 pb-2 text-xs">
                        <p className="text-white/85">{e.title}</p>
                        <p className="text-white/40">{e.actor} · {formatWhen(e.timestamp)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </RegistryAccordion>
          </div>
        </div>
      </div>
    </div>
  );
}

function RegistryAccordion({
  title,
  open,
  onToggle,
  borderClass,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  borderClass: string;
  children: ReactNode;
}) {
  return (
    <section className={`enterprise-glass rounded-xl border ${borderClass}`}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-3 text-left text-sm font-semibold text-white hover:bg-white/[0.02]"
      >
        {title}
        <span className="text-white/40">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="border-t border-white/10 px-5 pb-5 pt-2">{children}</div>}
    </section>
  );
}
