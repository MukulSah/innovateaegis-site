"use client";

import type { FounderSessionRow, FounderSessionTimelineData } from "@/lib/sai/founder-timeline";

type Props = {
  timeline: FounderSessionTimelineData;
  selectedId: string | null;
  searchQuery?: string;
  onSelect: (sessionId: string) => void;
};

function matchesSearch(row: FounderSessionRow, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  return (
    row.objective.toLowerCase().includes(q) ||
    row.projectName.toLowerCase().includes(q) ||
    String(row.sessionNumber ?? "").includes(q) ||
    (row.currentAgentName ?? "").toLowerCase().includes(q)
  );
}

function SessionNavGroup({
  label,
  rows,
  selectedId,
  searchQuery = "",
  onSelect,
}: {
  label: string;
  rows: FounderSessionRow[];
  selectedId: string | null;
  searchQuery?: string;
  onSelect: (sessionId: string) => void;
}) {
  const filtered = rows.filter((r) => matchesSearch(r, searchQuery));
  if (!filtered.length) return null;

  return (
    <div className="mb-4">
      <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-white/35">
        {label} ({filtered.length})
      </p>
      <ul className="space-y-0.5">
        {filtered.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => onSelect(s.id)}
              className={`w-full rounded-lg px-2 py-1.5 text-left text-xs transition-colors ${
                selectedId === s.id
                  ? "bg-purple-500/20 text-white ring-1 ring-purple-400/30"
                  : "text-white/55 hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="font-medium text-purple-200">#{s.sessionNumber ?? "—"}</span>
              <span className="ml-1 truncate text-white/70">{s.projectName}</span>
              <p className="mt-0.5 truncate text-[10px] text-white/40">{s.objective}</p>
              <p className="mt-0.5 text-[10px] capitalize text-white/30">
                {s.sessionStatus.replace(/_/g, " ")}
              </p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FounderSessionSidebar({ timeline, selectedId, searchQuery = "", onSelect }: Props) {
  const total =
    timeline.activeSessions.length +
    timeline.awaitingApprovalSessions.length +
    timeline.scheduledSessions.length +
    timeline.blockedSessions.length +
    timeline.needsFounderReview.length +
    timeline.completedSessions.length +
    timeline.archivedSessions.length +
    timeline.cancelledSessions.length;

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-white/10 bg-[#050510]/90">
      <div className="border-b border-white/10 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-purple-300/70">Sessions</p>
        <p className="mt-0.5 text-[10px] text-white/30">{total} total · permanent history</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <SessionNavGroup
          label="Active"
          rows={timeline.activeSessions}
          selectedId={selectedId}
          searchQuery={searchQuery}
          onSelect={onSelect}
        />
        <SessionNavGroup
          label="Awaiting Approval"
          rows={timeline.awaitingApprovalSessions}
          selectedId={selectedId}
          searchQuery={searchQuery}
          onSelect={onSelect}
        />
        <SessionNavGroup
          label="Scheduled"
          rows={timeline.scheduledSessions}
          selectedId={selectedId}
          searchQuery={searchQuery}
          onSelect={onSelect}
        />
        <SessionNavGroup
          label="Blocked"
          rows={timeline.blockedSessions}
          selectedId={selectedId}
          searchQuery={searchQuery}
          onSelect={onSelect}
        />
        <SessionNavGroup
          label="Needs Review"
          rows={timeline.needsFounderReview}
          selectedId={selectedId}
          searchQuery={searchQuery}
          onSelect={onSelect}
        />
        <SessionNavGroup
          label="Completed"
          rows={timeline.completedSessions}
          selectedId={selectedId}
          searchQuery={searchQuery}
          onSelect={onSelect}
        />
        <SessionNavGroup
          label="Archived"
          rows={timeline.archivedSessions}
          selectedId={selectedId}
          searchQuery={searchQuery}
          onSelect={onSelect}
        />
        <SessionNavGroup
          label="Cancelled"
          rows={timeline.cancelledSessions}
          selectedId={selectedId}
          searchQuery={searchQuery}
          onSelect={onSelect}
        />
      </div>
    </aside>
  );
}
