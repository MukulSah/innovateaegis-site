"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BrainKnowledgeGraph } from "@/components/sai/brain-knowledge-graph";
import type {
  AgentMemoryContainer,
  BrainCategory,
  BrainDomain,
  BrainSearchResult,
  BrainStats,
  FounderMemory,
  KnowledgeGraph,
  MemoryActivity,
  MemoryPermission,
  MemoryRecord,
  MemoryRelationship,
  MemoryVersion,
  PermissionLevel,
} from "@/lib/sai/brain/types";

type Tab = "records" | "relationships" | "history" | "versions" | "permissions" | "graph" | "search" | "retrieve";

type Props = {
  domains: BrainDomain[];
  categories: BrainCategory[];
  initialRecords: MemoryRecord[];
  stats: BrainStats;
  agentContainers: AgentMemoryContainer[];
  founderMemories: FounderMemory[];
  isFounder: boolean;
  supabaseConfigured: boolean;
  initialDomainSlug?: string;
};

const PERMISSION_LABELS: Record<PermissionLevel, string> = {
  public: "Public",
  department: "Department",
  selected_agents: "Selected Agents",
  founder_only: "Founder Only",
};

const FOUNDER_CATEGORIES = [
  "Ideas Vault",
  "Vision Notes",
  "Future Products",
  "Founder Decisions",
  "Strategic Notes",
  "Business Opportunities",
  "Personal Learnings",
  "Acquisition Ideas",
  "Partnership Ideas",
];

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export function BrainView({
  domains,
  categories,
  initialRecords,
  stats,
  agentContainers,
  founderMemories: initialFounderMemories,
  isFounder,
  supabaseConfigured,
  initialDomainSlug,
}: Props) {
  const router = useRouter();
  const [selectedDomainSlug, setSelectedDomainSlug] = useState<string | null>(
    initialDomainSlug ?? null,
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [records, setRecords] = useState(initialRecords);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("records");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BrainSearchResult[]>([]);
  const [retrieveQuery, setRetrieveQuery] = useState("");
  const [retrieveResult, setRetrieveResult] = useState<string | null>(null);
  const [relationships, setRelationships] = useState<MemoryRelationship[]>([]);
  const [activities, setActivities] = useState<MemoryActivity[]>([]);
  const [versions, setVersions] = useState<MemoryVersion[]>([]);
  const [permissions, setPermissions] = useState<MemoryPermission[]>([]);
  const [graph, setGraph] = useState<KnowledgeGraph | null>(null);
  const [founderMemories, setFounderMemories] = useState(initialFounderMemories);
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [recordForm, setRecordForm] = useState({
    title: "",
    description: "",
    content: "",
    domainId: "",
    categoryId: "",
    permissionLevel: "public" as PermissionLevel,
    tags: "",
  });

  const [linkTargetId, setLinkTargetId] = useState("");
  const [founderForm, setFounderForm] = useState({
    category: FOUNDER_CATEGORIES[0],
    title: "",
    content: "",
    tags: "",
  });

  const selectedDomain = domains.find((d) => d.slug === selectedDomainSlug) ?? null;
  const domainCategories = useMemo(
    () =>
      selectedDomain
        ? categories.filter((c) => c.domainId === selectedDomain.id)
        : categories,
    [categories, selectedDomain],
  );

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (selectedDomain && r.domainId !== selectedDomain.id) return false;
      if (selectedCategoryId && r.categoryId !== selectedCategoryId) return false;
      if (searchQuery.trim() && activeTab === "records") {
        const q = searchQuery.toLowerCase();
        return (
          r.title.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.content.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [records, selectedDomain, selectedCategoryId, searchQuery, activeTab]);

  const selectedRecord = records.find((r) => r.id === selectedRecordId) ?? null;

  const loadRecords = useCallback(async () => {
    const params = new URLSearchParams();
    if (selectedDomainSlug) params.set("domainSlug", selectedDomainSlug);
    if (selectedCategoryId) params.set("categoryId", selectedCategoryId);
    params.set("includeArchived", "true");

    const res = await fetch(`/api/sai/brain/records?${params}`);
    if (res.ok) {
      const data = await res.json();
      setRecords(data.records ?? []);
    }
  }, [selectedDomainSlug, selectedCategoryId]);

  const loadRecordDetails = useCallback(async (id: string) => {
    const [relRes, actRes, verRes, permRes, graphRes] = await Promise.all([
      fetch(`/api/sai/brain/records/${id}/relationships`),
      fetch(`/api/sai/brain/records/${id}/activities`),
      fetch(`/api/sai/brain/records/${id}/versions`),
      fetch(`/api/sai/brain/records/${id}/permissions`),
      fetch(`/api/sai/brain/records/${id}/graph?depth=2`),
    ]);

    if (relRes.ok) setRelationships((await relRes.json()).relationships ?? []);
    if (actRes.ok) setActivities((await actRes.json()).activities ?? []);
    if (verRes.ok) setVersions((await verRes.json()).versions ?? []);
    if (permRes.ok) setPermissions((await permRes.json()).permissions ?? []);
    if (graphRes.ok) setGraph((await graphRes.json()).graph ?? null);
  }, []);

  useEffect(() => {
    if (selectedRecordId) loadRecordDetails(selectedRecordId);
  }, [selectedRecordId, loadRecordDetails]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  async function handleBrainSearch(e: FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    setActiveTab("search");
    try {
      const params = new URLSearchParams({ q: searchQuery });
      if (selectedDomainSlug) params.set("domainSlug", selectedDomainSlug);
      const res = await fetch(`/api/sai/brain/search?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed");
      setSearchResults(data.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleRetrieve(e: FormEvent) {
    e.preventDefault();
    if (!retrieveQuery.trim()) return;
    setLoading(true);
    setActiveTab("retrieve");
    try {
      const res = await fetch("/api/sai/brain/retrieve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: retrieveQuery, limit: 15 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Retrieval failed");
      const ctx = data.context;
      setRetrieveResult(
        JSON.stringify(
          {
            query: ctx.query,
            domainsSearched: ctx.domainsSearched,
            recordCount: ctx.records?.length ?? 0,
            records: ctx.records?.map((r: MemoryRecord) => ({
              title: r.title,
              domain: r.domainName,
              summary: r.aiSummary || r.description,
            })),
            relatedDecisions: ctx.relatedDecisions?.length ?? 0,
            relatedProducts: ctx.relatedProducts?.length ?? 0,
            relatedCustomers: ctx.relatedCustomers?.length ?? 0,
          },
          null,
          2,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retrieval failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateRecord(e: FormEvent) {
    e.preventDefault();
    if (!isFounder) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/sai/brain/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: recordForm.title,
          description: recordForm.description,
          content: recordForm.content,
          domainId: recordForm.domainId || selectedDomain?.id,
          categoryId: recordForm.categoryId || selectedCategoryId || null,
          permissionLevel: recordForm.permissionLevel,
          tags: recordForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create record");
      setRecords((prev) => [data.record, ...prev]);
      setFormOpen(false);
      setRecordForm({
        title: "",
        description: "",
        content: "",
        domainId: "",
        categoryId: "",
        permissionLevel: "public",
        tags: "",
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create record");
    } finally {
      setLoading(false);
    }
  }

  async function handleArchiveRecord(id: string) {
    const res = await fetch(`/api/sai/brain/records/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "archive" }),
    });
    if (res.ok) {
      const data = await res.json();
      setRecords((prev) => prev.map((r) => (r.id === id ? data.record : r)));
    }
  }

  async function handleRestoreRecord(id: string) {
    const res = await fetch(`/api/sai/brain/records/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "restore" }),
    });
    if (res.ok) {
      const data = await res.json();
      setRecords((prev) => prev.map((r) => (r.id === id ? data.record : r)));
    }
  }

  async function handleAddRelationship(e: FormEvent) {
    e.preventDefault();
    if (!selectedRecordId || !linkTargetId.trim()) return;
    const res = await fetch(`/api/sai/brain/records/${selectedRecordId}/relationships`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId: linkTargetId.trim() }),
    });
    if (res.ok) {
      setLinkTargetId("");
      loadRecordDetails(selectedRecordId);
    }
  }

  async function handleCreateFounderMemory(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/sai/brain/founder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: founderForm.category,
          title: founderForm.title,
          content: founderForm.content,
          tags: founderForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      setFounderMemories((prev) => [data.memory, ...prev]);
      setFounderForm({ category: FOUNDER_CATEGORIES[0], title: "", content: "", tags: "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  if (!supabaseConfigured) {
    return (
      <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-6 text-sm text-amber-200">
        Supabase is not configured. Connect your database to activate InnovateAegis Brain.
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] gap-0 overflow-hidden rounded-2xl border border-purple-400/15 bg-[#06061a]/80">
      {/* Domain sidebar */}
      <aside className="w-56 shrink-0 border-r border-white/10 bg-[#050510]/90 p-4">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-purple-300/70">
          Company Brain
        </p>
        <button
          type="button"
          onClick={() => {
            setSelectedDomainSlug(null);
            setSelectedCategoryId(null);
          }}
          className={`mb-1 w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
            !selectedDomainSlug
              ? "bg-purple-500/15 text-white"
              : "text-white/55 hover:bg-white/5 hover:text-white"
          }`}
        >
          <span className="mr-2 text-purple-300/70">◉</span>
          All Domains
        </button>
        <ul className="space-y-0.5">
          {domains.map((domain) => (
            <li key={domain.id}>
              <button
                type="button"
                onClick={() => {
                  setSelectedDomainSlug(domain.slug);
                  setSelectedCategoryId(null);
                  setActiveTab("records");
                }}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  selectedDomainSlug === domain.slug
                    ? "bg-purple-500/15 text-white"
                    : "text-white/55 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="mr-2 text-purple-300/70">{domain.icon}</span>
                {domain.name.replace(" Brain", "")}
                <span className="ml-1 text-[10px] text-white/30">({domain.recordCount ?? 0})</span>
              </button>
            </li>
          ))}
        </ul>

        {selectedDomain && domainCategories.length > 0 && (
          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/35">
              Categories
            </p>
            <ul className="space-y-0.5">
              {domainCategories.map((cat) => (
                <li key={cat.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`w-full rounded px-2 py-1.5 text-left text-xs transition-colors ${
                      selectedCategoryId === cat.id
                        ? "bg-white/10 text-white"
                        : "text-white/45 hover:text-white/70"
                    }`}
                  >
                    {cat.name}
                    <span className="ml-1 text-white/25">({cat.recordCount ?? 0})</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>

      {/* Main panel */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Stats bar */}
        <div className="flex flex-wrap items-center gap-4 border-b border-white/10 px-5 py-3">
          <Stat label="Records" value={stats.activeRecords} />
          <Stat label="Domains" value={stats.totalDomains} />
          <Stat label="Links" value={stats.totalRelationships} />
          <Stat label="Retrievals" value={stats.retrievalCount} />
          <Stat label="Agent Spaces" value={stats.agentContainers} />
          {isFounder && <Stat label="Founder Notes" value={stats.founderMemories} />}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-5 py-3">
          <form onSubmit={handleBrainSearch} className="flex flex-1 gap-2">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memory — keyword, tag, domain…"
              className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30"
            />
            <button
              type="submit"
              className="rounded-lg bg-purple-600/80 px-4 py-2 text-xs font-medium text-white hover:bg-purple-600"
            >
              Search
            </button>
          </form>
          {isFounder && (
            <button
              type="button"
              onClick={() => {
                setRecordForm((f) => ({
                  ...f,
                  domainId: selectedDomain?.id ?? "",
                  categoryId: selectedCategoryId ?? "",
                }));
                setFormOpen(true);
              }}
              className="rounded-lg border border-purple-400/30 bg-purple-500/10 px-4 py-2 text-xs font-medium text-purple-200 hover:bg-purple-500/20"
            >
              + New Record
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto border-b border-white/10 px-5 py-2">
          {(
            [
              ["records", "Records"],
              ["search", "Search"],
              ["retrieve", "Retrieval"],
              ["relationships", "Relationships"],
              ["graph", "Knowledge Graph"],
              ["versions", "Versions"],
              ["permissions", "Permissions"],
              ["history", "History"],
            ] as const
          ).map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              disabled={tab !== "records" && tab !== "search" && tab !== "retrieve" && !selectedRecord}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === tab
                  ? "bg-purple-500/20 text-white"
                  : "text-white/45 hover:text-white/70 disabled:opacity-30"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <p className="mx-5 mt-3 rounded-lg border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {error}
          </p>
        )}

        <div className="flex flex-1 overflow-hidden">
          {/* Content list */}
          <div className="w-80 shrink-0 overflow-y-auto border-r border-white/10 p-4">
            {activeTab === "records" && (
              <ul className="space-y-2">
                {filteredRecords.length === 0 && (
                  <li className="text-sm text-white/40">No records yet. Create your first memory.</li>
                )}
                {filteredRecords.map((record) => (
                  <li key={record.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRecordId(record.id);
                        setActiveTab("records");
                      }}
                      className={`w-full rounded-xl border p-3 text-left transition-colors ${
                        selectedRecordId === record.id
                          ? "border-purple-400/40 bg-purple-500/10"
                          : "border-white/10 bg-white/[0.02] hover:border-white/20"
                      }`}
                    >
                      <p className="text-sm font-medium text-white">{record.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs text-white/45">
                        {record.aiSummary || record.description || record.content}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/50">
                          {record.domainName}
                        </span>
                        {record.status !== "active" && (
                          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300">
                            {record.status}
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {activeTab === "search" && (
              <ul className="space-y-2">
                {searchResults.map((result) => (
                  <li key={result.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedRecordId(result.id)}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.02] p-3 text-left hover:border-white/20"
                    >
                      <p className="text-sm font-medium text-white">{result.title}</p>
                      <p className="mt-1 text-xs text-white/45">{result.summary}</p>
                      <p className="mt-1 text-[10px] text-purple-300/60">
                        {result.domainName} · {result.relatedCount} links · score {result.score}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {selectedDomainSlug === "ai-agent" && activeTab === "records" && (
              <div className="mt-4 border-t border-white/10 pt-4">
                <p className="mb-2 text-[10px] uppercase tracking-wider text-white/35">Agent Containers</p>
                <ul className="space-y-1">
                  {agentContainers.map((c) => (
                    <li
                      key={c.id}
                      className="rounded-lg border border-white/5 bg-white/[0.02] px-2 py-1.5 text-xs text-white/55"
                    >
                      {c.displayName}
                      <span className="ml-1 text-white/25">({c.recordCount ?? 0})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Detail panel */}
          <div className="flex-1 overflow-y-auto p-5">
            {activeTab === "retrieve" && (
              <div className="space-y-4">
                <p className="text-sm text-white/55">
                  Retrieval engine — identifies domains, searches, ranks, and returns a context package
                  for future agents. No AI generation yet.
                </p>
                <form onSubmit={handleRetrieve} className="flex gap-2">
                  <input
                    value={retrieveQuery}
                    onChange={(e) => setRetrieveQuery(e.target.value)}
                    placeholder="e.g. Sentra deployment architecture decisions"
                    className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-lg bg-cyan-600/80 px-4 py-2 text-xs font-medium text-white"
                  >
                    Retrieve Context
                  </button>
                </form>
                {retrieveResult && (
                  <pre className="overflow-x-auto rounded-xl border border-white/10 bg-black/30 p-4 text-xs text-emerald-200/90">
                    {retrieveResult}
                  </pre>
                )}
              </div>
            )}

            {activeTab === "graph" && graph && (
              <BrainKnowledgeGraph
                graph={graph}
                onSelectNode={(id) => {
                  setSelectedRecordId(id);
                  setActiveTab("records");
                }}
              />
            )}

            {selectedRecord && activeTab !== "retrieve" && activeTab !== "search" && (
              <div className="space-y-5">
                <header>
                  <p className="text-[10px] uppercase tracking-wider text-purple-300/60">
                    {selectedRecord.domainName}
                    {selectedRecord.categoryName ? ` · ${selectedRecord.categoryName}` : ""}
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-white">{selectedRecord.title}</h2>
                  <p className="mt-2 text-sm text-white/55">
                    {selectedRecord.description || "No description"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/50">
                      v{selectedRecord.version}
                    </span>
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/50">
                      {PERMISSION_LABELS[selectedRecord.permissionLevel]}
                    </span>
                    <span className="text-[10px] text-white/30">
                      Updated {formatDate(selectedRecord.updatedAt)}
                    </span>
                  </div>
                  {isFounder && (
                    <div className="mt-3 flex gap-2">
                      {selectedRecord.status === "active" ? (
                        <button
                          type="button"
                          onClick={() => handleArchiveRecord(selectedRecord.id)}
                          className="rounded border border-white/10 px-2 py-1 text-[10px] text-white/50 hover:text-white"
                        >
                          Archive
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRestoreRecord(selectedRecord.id)}
                          className="rounded border border-emerald-400/20 px-2 py-1 text-[10px] text-emerald-300"
                        >
                          Restore
                        </button>
                      )}
                    </div>
                  )}
                </header>

                {(activeTab === "records" || activeTab === "history") && (
                  <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40">
                      Content
                    </h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/70">
                      {selectedRecord.content || "No content"}
                    </p>
                    {selectedRecord.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {selectedRecord.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] text-purple-200"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "relationships" && (
                  <div className="space-y-4">
                    <ul className="space-y-2">
                      {relationships.map((rel) => (
                        <li
                          key={rel.id}
                          className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white/70"
                        >
                          <span className="text-purple-300">{rel.relationshipType}</span>
                          {" → "}
                          {rel.sourceId === selectedRecord.id ? rel.targetTitle : rel.sourceTitle}
                          <span className="ml-2 text-[10px] text-white/30">
                            ({rel.sourceId === selectedRecord.id ? rel.targetDomain : rel.sourceDomain})
                          </span>
                        </li>
                      ))}
                    </ul>
                    {isFounder && (
                      <form onSubmit={handleAddRelationship} className="flex gap-2">
                        <input
                          value={linkTargetId}
                          onChange={(e) => setLinkTargetId(e.target.value)}
                          placeholder="Target record ID"
                          className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white"
                        />
                        <button
                          type="submit"
                          className="rounded-lg bg-purple-600/80 px-3 py-2 text-xs text-white"
                        >
                          Link
                        </button>
                      </form>
                    )}
                  </div>
                )}

                {activeTab === "versions" && (
                  <ul className="space-y-3">
                    {versions.map((v) => (
                      <li
                        key={v.id}
                        className="rounded-lg border border-white/10 bg-white/[0.02] p-3"
                      >
                        <p className="text-sm font-medium text-white">
                          v{v.versionNumber} — {v.title}
                        </p>
                        <p className="mt-1 text-xs text-white/45">{v.changeSummary}</p>
                        <p className="mt-1 text-[10px] text-white/30">{formatDate(v.createdAt)}</p>
                      </li>
                    ))}
                  </ul>
                )}

                {activeTab === "permissions" && (
                  <div className="space-y-2">
                    <p className="text-sm text-white/55">
                      Level: {PERMISSION_LABELS[selectedRecord.permissionLevel]}
                    </p>
                    {permissions.map((p) => (
                      <div
                        key={p.id}
                        className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/60"
                      >
                        {p.granteeType}: {p.grantee} — read {p.canRead ? "✓" : "✗"} / write{" "}
                        {p.canWrite ? "✓" : "✗"}
                      </div>
                    ))}
                    {!permissions.length && selectedRecord.permissionLevel === "public" && (
                      <p className="text-xs text-white/35">Visible to all authenticated users.</p>
                    )}
                  </div>
                )}

                {activeTab === "history" && (
                  <ul className="space-y-2">
                    {activities.map((a) => (
                      <li
                        key={a.id}
                        className="rounded-lg border border-white/10 px-3 py-2 text-xs text-white/55"
                      >
                        <span className="text-purple-300">{a.action}</span>
                        <span className="ml-2 text-white/30">{formatDate(a.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {!selectedRecord && activeTab === "records" && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <p className="text-4xl text-purple-400/30">◉</p>
                <p className="mt-3 text-sm text-white/45">Select a record to view details</p>
                <p className="mt-1 max-w-sm text-xs text-white/30">
                  InnovateAegis Brain stores structured company memory across domains, categories,
                  and relationships — the foundation for every future agent.
                </p>
              </div>
            )}

            {selectedDomainSlug === "founder" && isFounder && (
              <div className="mt-8 rounded-xl border border-fuchsia-400/20 bg-fuchsia-500/5 p-5">
                <p className="text-sm text-white/70">
                  Personal founder knowledge lives in Founder Workspace — not Company Brain.
                </p>
                <Link
                  href="/sai/founder"
                  className="mt-3 inline-block rounded-lg bg-fuchsia-600/80 px-4 py-2 text-xs font-medium text-white"
                >
                  Open Founder Workspace →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create record modal */}
      {formOpen && isFounder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <form
            onSubmit={handleCreateRecord}
            className="w-full max-w-lg space-y-3 rounded-2xl border border-purple-400/20 bg-[#0a0a24] p-6"
          >
            <h3 className="text-lg font-semibold text-white">New Memory Record</h3>
            <input
              required
              value={recordForm.title}
              onChange={(e) => setRecordForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Title"
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
            />
            <select
              required
              value={recordForm.domainId}
              onChange={(e) => setRecordForm((f) => ({ ...f, domainId: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
            >
              <option value="">Select domain</option>
              {domains.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <textarea
              value={recordForm.description}
              onChange={(e) => setRecordForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Description"
              rows={2}
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
            />
            <textarea
              value={recordForm.content}
              onChange={(e) => setRecordForm((f) => ({ ...f, content: e.target.value }))}
              placeholder="Content"
              rows={4}
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
            />
            <select
              value={recordForm.permissionLevel}
              onChange={(e) =>
                setRecordForm((f) => ({
                  ...f,
                  permissionLevel: e.target.value as PermissionLevel,
                }))
              }
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
            >
              {Object.entries(PERMISSION_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <input
              value={recordForm.tags}
              onChange={(e) => setRecordForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="Tags (comma-separated)"
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-lg px-4 py-2 text-xs text-white/50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-purple-600 px-4 py-2 text-xs font-medium text-white"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-white/35">{label}</p>
    </div>
  );
}
