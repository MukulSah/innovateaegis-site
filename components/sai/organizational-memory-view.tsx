"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Agent, Project } from "@/lib/sai/types";
import type {
  ExecutiveTimelineEntry,
  MemoryStoryStep,
  OrganizationalMemoryRecord,
  OrgMemoryImportance,
  OrgMemoryNavSection,
  OrgMemoryType,
  OrgMemoryViewMode,
} from "@/lib/sai/organizational-memory.types";
import {
  getImportanceColor,
  getMemoryTypeLabel,
  IMPORTANCE_LABELS,
  ORG_MEMORY_NAV,
} from "@/lib/sai/organizational-memory.types";

type Props = {
  initialMemories: OrganizationalMemoryRecord[];
  sectionCounts: Record<OrgMemoryNavSection, number>;
  initialTimeline: ExecutiveTimelineEntry[];
  projects: Project[];
  agents: Agent[];
  isFounder: boolean;
  supabaseConfigured: boolean;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString();
}

function groupByMonth(entries: ExecutiveTimelineEntry[]) {
  const groups = new Map<string, ExecutiveTimelineEntry[]>();
  for (const entry of entries) {
    const key = new Date(entry.date).toLocaleDateString(undefined, { month: "long", year: "numeric" });
    const list = groups.get(key) ?? [];
    list.push(entry);
    groups.set(key, list);
  }
  return groups;
}

export function OrganizationalMemoryView({
  initialMemories,
  sectionCounts,
  initialTimeline,
  projects,
  agents,
  isFounder,
  supabaseConfigured,
}: Props) {
  const [navSection, setNavSection] = useState<OrgMemoryNavSection>("executive_timeline");
  const [viewMode, setViewMode] = useState<OrgMemoryViewMode>("timeline");
  const [memories, setMemories] = useState(initialMemories);
  const [timeline, setTimeline] = useState(initialTimeline);
  const [storySteps, setStorySteps] = useState<MemoryStoryStep[]>([]);
  const [agentFilter, setAgentFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [importanceFilter, setImportanceFilter] = useState<OrgMemoryImportance | "all">("all");
  const [memoryTypeFilter, setMemoryTypeFilter] = useState<OrgMemoryType | "all">("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingStory, setLoadingStory] = useState(false);

  const filtered = useMemo(() => {
    return memories.filter((m) => {
      if (navSection === "agent_participation" && agentFilter !== "all") {
        const inParticipants = m.participantAgentIds.includes(agentFilter);
        if (!inParticipants && m.relatedAgentId !== agentFilter) return false;
      }
      if (projectFilter !== "all" && m.relatedProjectId !== projectFilter) return false;
      if (importanceFilter !== "all" && m.importance !== importanceFilter) return false;
      if (memoryTypeFilter !== "all" && m.memoryType !== memoryTypeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          m.title.toLowerCase().includes(q) ||
          m.summary.toLowerCase().includes(q) ||
          m.content.toLowerCase().includes(q) ||
          m.outcome.toLowerCase().includes(q) ||
          m.participantNames.some((p) => p.toLowerCase().includes(q)) ||
          m.tags.some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [memories, navSection, agentFilter, projectFilter, importanceFilter, memoryTypeFilter, search]);

  const selected = memories.find((m) => m.id === selectedId) ?? null;
  const timelineGroups = useMemo(() => groupByMonth(timeline), [timeline]);

  const loadStory = useCallback(async (projectId: string) => {
    setLoadingStory(true);
    try {
      const res = await fetch(`/api/sai/organizational-memory/story?projectId=${projectId}`);
      const data = await res.json();
      if (res.ok) setStorySteps(data.steps ?? []);
    } finally {
      setLoadingStory(false);
    }
  }, []);

  useEffect(() => {
    if (viewMode === "story" && projectFilter !== "all") {
      loadStory(projectFilter);
    } else {
      setStorySteps([]);
    }
  }, [viewMode, projectFilter, loadStory]);

  useEffect(() => {
    if (navSection === "executive_timeline") setViewMode("timeline");
    if (navSection === "relationships") setViewMode("graph");
    if (navSection === "explorer") setViewMode("table");
  }, [navSection]);

  if (!supabaseConfigured) {
    return (
      <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-6 text-sm text-amber-200">
        Connect Supabase to activate Organizational Memory.
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-12rem)] gap-0 overflow-hidden rounded-2xl border border-cyan-400/15 bg-[#06061a]/80">
      <aside className="w-56 shrink-0 border-r border-white/10 bg-[#050510]/90 p-4">
        <div className="mb-3 rounded-lg border border-cyan-400/20 bg-cyan-500/5 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300/80">
            Institutional Memory — Locked
          </p>
          <p className="mt-1 text-[10px] text-white/40">Experience, not truth</p>
        </div>

        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300/70">
          Memory Navigation
        </p>

        <ul className="space-y-0.5">
          {ORG_MEMORY_NAV.map((section) => (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => {
                  setNavSection(section.id);
                  setSelectedId(null);
                }}
                className={`w-full rounded-lg px-3 py-2 text-left text-xs ${
                  navSection === section.id
                    ? "bg-cyan-500/15 text-white"
                    : "text-white/50 hover:bg-white/5 hover:text-white"
                }`}
              >
                {section.label}
                <span className="ml-1 text-white/25">({sectionCounts[section.id] ?? 0})</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-b border-white/10 px-5 py-3">
          <p className="text-sm font-medium text-white">
            {ORG_MEMORY_NAV.find((n) => n.id === navSection)?.label}
          </p>
          <p className="text-[11px] text-white/40">
            {ORG_MEMORY_NAV.find((n) => n.id === navSection)?.description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-5 py-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="What happened? Who was involved?"
            className="min-w-[200px] flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
          />
          <select
            value={agentFilter}
            onChange={(e) => setAgentFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white"
          >
            <option value="all">All Participants</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {navSection === "explorer" && (
            <>
              <select
                value={importanceFilter}
                onChange={(e) => setImportanceFilter(e.target.value as OrgMemoryImportance | "all")}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white"
              >
                <option value="all">All Importance</option>
                {Object.entries(IMPORTANCE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <select
                value={memoryTypeFilter}
                onChange={(e) => setMemoryTypeFilter(e.target.value as OrgMemoryType | "all")}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white"
              >
                <option value="all">All Types</option>
                {(["event", "decision", "discussion", "meeting", "project", "learning"] as OrgMemoryType[]).map((t) => (
                  <option key={t} value={t}>{getMemoryTypeLabel(t)}</option>
                ))}
              </select>
            </>
          )}
          <div className="flex rounded-lg border border-white/10 p-0.5">
            {(["timeline", "table", "story", "graph"] as OrgMemoryViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`rounded-md px-2.5 py-1 text-[10px] capitalize ${
                  viewMode === mode ? "bg-cyan-500/20 text-white" : "text-white/40"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {viewMode === "timeline" && navSection === "executive_timeline" ? (
            <div className="flex-1 overflow-y-auto p-5">
              {timeline.length === 0 ? (
                <p className="text-sm text-white/40">
                  Executive timeline populates automatically from meetings, decisions, and project events.
                </p>
              ) : (
                <div className="space-y-8">
                  {[...timelineGroups.entries()].map(([month, entries]) => (
                    <section key={month}>
                      <h3 className="mb-4 text-sm font-semibold text-cyan-300/80">{month}</h3>
                      <ul className="space-y-3 border-l border-cyan-400/20 pl-4">
                        {entries.map((entry) => (
                          <li key={entry.id} className="relative">
                            <span className="absolute -left-[21px] top-2 h-2.5 w-2.5 rounded-full bg-cyan-400/60" />
                            <button
                              type="button"
                              onClick={() => setSelectedId(entry.id)}
                              className="w-full rounded-xl border border-white/10 bg-white/[0.02] p-4 text-left hover:border-cyan-400/30"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] text-white/35">{formatDate(entry.date)}</span>
                                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/50">
                                  {getMemoryTypeLabel(entry.memoryType)}
                                </span>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] ${getImportanceColor(entry.importance)}`}>
                                  {IMPORTANCE_LABELS[entry.importance]}
                                </span>
                              </div>
                              <p className="mt-2 font-medium text-white">{entry.title}</p>
                              <p className="mt-1 text-xs text-white/45">{entry.summary}</p>
                              <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-white/35">
                                {entry.participants.length > 0 && (
                                  <span>Participants: {entry.participants.join(", ")}</span>
                                )}
                                {entry.outcome && <span>Outcome: {entry.outcome}</span>}
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              )}
            </div>
          ) : viewMode === "story" && projectFilter !== "all" ? (
            <div className="flex-1 overflow-y-auto p-5">
              {loadingStory ? (
                <p className="text-sm text-white/40">Loading story…</p>
              ) : storySteps.length === 0 ? (
                <p className="text-sm text-white/40">
                  No story chain for this project yet. Memories link automatically as execution progresses.
                </p>
              ) : (
                <div className="mx-auto max-w-xl">
                  <h3 className="mb-6 text-center text-sm font-semibold text-white">
                    {projects.find((p) => p.id === projectFilter)?.name} — Initiative Story
                  </h3>
                  <ol className="space-y-0">
                    {storySteps.map((step, i) => (
                      <li key={step.id} className="relative pb-8 pl-8">
                        {i < storySteps.length - 1 && (
                          <span className="absolute left-3 top-6 h-full w-px bg-cyan-400/30" />
                        )}
                        <span className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/20 text-[10px] text-cyan-200">
                          {step.order}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedId(step.id)}
                          className="w-full rounded-xl border border-white/10 bg-white/[0.02] p-3 text-left hover:border-cyan-400/30"
                        >
                          <p className="text-[10px] text-white/35">
                            {getMemoryTypeLabel(step.memoryType)} · {formatDate(step.occurredAt)}
                          </p>
                          <p className="mt-1 font-medium text-white">{step.title}</p>
                          <p className="mt-1 text-xs text-white/45">{step.summary}</p>
                          {step.outcome && (
                            <p className="mt-1 text-[10px] text-cyan-300/60">→ {step.outcome}</p>
                          )}
                        </button>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          ) : viewMode === "graph" && navSection === "relationships" ? (
            <div className="flex flex-1 overflow-hidden">
              <MemoryListPanel
                items={filtered}
                selectedId={selectedId}
                onSelect={setSelectedId}
                emptyMessage="Relationship graph builds as memories link to projects, meetings, and decisions."
              />
              <div className="flex-1 overflow-y-auto p-5">
                {selected ? (
                  <RelationshipPanel memory={selected} allMemories={memories} />
                ) : (
                  <EmptyState message="Select a memory to explore its relationships." />
                )}
              </div>
            </div>
          ) : viewMode === "table" ? (
            <div className="flex-1 overflow-auto p-5">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-white/40">
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 pr-4">Type</th>
                    <th className="pb-2 pr-4">Title</th>
                    <th className="pb-2 pr-4">Participants</th>
                    <th className="pb-2 pr-4">Outcome</th>
                    <th className="pb-2">Importance</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => (
                    <tr
                      key={m.id}
                      onClick={() => setSelectedId(m.id)}
                      className="cursor-pointer border-b border-white/5 hover:bg-white/[0.03]"
                    >
                      <td className="py-2 pr-4 text-white/50">{formatDate(m.occurredAt)}</td>
                      <td className="py-2 pr-4 text-white/60">{getMemoryTypeLabel(m.memoryType)}</td>
                      <td className="py-2 pr-4 text-white">{m.title}</td>
                      <td className="py-2 pr-4 text-white/45">
                        {m.participantNames.join(", ") || m.relatedAgentName || "—"}
                      </td>
                      <td className="py-2 pr-4 text-white/45">{m.outcome || "—"}</td>
                      <td className="py-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] ${getImportanceColor(m.importance)}`}>
                          {IMPORTANCE_LABELS[m.importance]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <>
              <MemoryListPanel
                items={filtered}
                selectedId={selectedId}
                onSelect={setSelectedId}
                emptyMessage="Memories are generated automatically from meetings, decisions, projects, and execution."
              />
              <div className="flex-1 overflow-y-auto p-5">
                {selected ? (
                  <MemoryDetailPanel memory={selected} />
                ) : (
                  <EmptyState
                    message={
                      isFounder
                        ? "Institutional memory answers: What happened? Why? Who was involved? What came from it?"
                        : "Select a memory to explore company experience."
                    }
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MemoryListPanel({
  items,
  selectedId,
  onSelect,
  emptyMessage,
}: {
  items: OrganizationalMemoryRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  emptyMessage: string;
}) {
  return (
    <div className="w-80 shrink-0 overflow-y-auto border-r border-white/10 p-4">
      <ul className="space-y-2">
        {items.length === 0 && <li className="text-sm text-white/40">{emptyMessage}</li>}
        {items.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => onSelect(m.id)}
              className={`w-full rounded-xl border p-3 text-left ${
                selectedId === m.id
                  ? "border-cyan-400/40 bg-cyan-500/10"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20"
              }`}
            >
              <div className="flex flex-wrap gap-1">
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/50">
                  {getMemoryTypeLabel(m.memoryType)}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${getImportanceColor(m.importance)}`}>
                  {IMPORTANCE_LABELS[m.importance]}
                </span>
              </div>
              <p className="mt-2 text-sm font-medium text-white">{m.title}</p>
              <p className="mt-1 line-clamp-2 text-xs text-white/45">{m.summary}</p>
              <p className="mt-2 text-[10px] text-white/30">{formatDate(m.occurredAt)}</p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MemoryDetailPanel({ memory }: { memory: OrganizationalMemoryRecord }) {
  return (
    <div className="space-y-4">
      <header>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-cyan-500/15 px-2.5 py-0.5 text-[10px] text-cyan-200">
            {getMemoryTypeLabel(memory.memoryType)}
          </span>
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] ${getImportanceColor(memory.importance)}`}>
            {IMPORTANCE_LABELS[memory.importance]}
          </span>
          <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[10px] text-white/40">
            {memory.source}
          </span>
        </div>
        <h2 className="mt-3 text-xl font-bold text-white">{memory.title}</h2>
        <p className="mt-2 text-sm text-white/55">{memory.summary}</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <InfoCard label="What happened" value={memory.content || memory.summary} />
        <InfoCard label="Outcome" value={memory.outcome || "—"} />
        <InfoCard
          label="Who was involved"
          value={
            memory.participantNames.length
              ? memory.participantNames.join(", ")
              : memory.relatedAgentName ?? "—"
          }
        />
        <InfoCard label="When" value={formatDateTime(memory.occurredAt)} />
        {memory.relatedProjectName && (
          <InfoCard label="Related Project" value={memory.relatedProjectName} />
        )}
      </div>

      {Object.keys(memory.metadata).length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/35">
            Context
          </p>
          <dl className="grid gap-2 sm:grid-cols-2">
            {Object.entries(memory.metadata).map(([key, value]) => (
              <div key={key}>
                <dt className="text-[10px] text-white/35">{key}</dt>
                <dd className="text-xs text-white/65">
                  {typeof value === "string" ? value : JSON.stringify(value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-[10px] text-white/35">
        <span>Created by {memory.createdBy}</span>
        <span>v{memory.version}</span>
        <span>Visibility: {memory.visibility}</span>
      </div>

      {memory.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {memory.tags.map((t) => (
            <span key={t} className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-200">
              #{t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function RelationshipPanel({
  memory,
  allMemories,
}: {
  memory: OrganizationalMemoryRecord;
  allMemories: OrganizationalMemoryRecord[];
}) {
  const linked = allMemories.filter(
    (m) =>
      m.id !== memory.id &&
      (m.storyKey === memory.storyKey ||
        m.relatedProjectId === memory.relatedProjectId ||
        m.relatedMeetingId === memory.relatedMeetingId ||
        memory.relationships.some((r) => r.targetMemoryId === m.id)),
  );

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Relationship View</h3>
      <p className="text-sm text-white/50">{memory.title}</p>
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 font-mono text-xs text-cyan-200/80">
        <p>{memory.title}</p>
        {linked.map((m) => (
          <p key={m.id} className="ml-4 before:content-['↓_']">
            {getMemoryTypeLabel(m.memoryType)}: {m.title}
          </p>
        ))}
        {linked.length === 0 && (
          <p className="text-white/35">No linked memories yet — connections form as execution progresses.</p>
        )}
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-white/35">{label}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-white/70">{value}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <p className="text-4xl text-cyan-400/30">◎</p>
      <p className="mt-3 max-w-md text-sm text-white/45">{message}</p>
      <p className="mt-2 max-w-sm text-xs text-white/30">
        Company Brain stores truth. Organizational Memory stores experience.
      </p>
    </div>
  );
}
